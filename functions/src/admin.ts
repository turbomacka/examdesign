import {
  FieldValue,
  getFirestore,
  type DocumentSnapshot,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";
import { randomInt } from "crypto";
import { defineSecret } from "firebase-functions/params";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { z } from "zod";

export const OWNER_UID = defineSecret("OWNER_UID");

const DATABASE_ID = "examdesign";
const ACCESS_COLLECTION = "accessControl";
const INVITE_CODES_DOC = "inviteCodes";
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const pitfallSchema = z.enum([
  "pseudo_agens",
  "dokumentationsfetisch",
  "vardering",
  "taxonomi_dominans",
  "pseudo_autenticitet",
  "triptyk_tvang",
  "annan",
]);

const wouldUseAsSchema = z.enum([
  "som_ar",
  "mindre_just",
  "stora_just",
  "nej",
]);

const filtersSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  minUsefulness: z.number().min(1).max(5).optional(),
  pitfall: pitfallSchema.optional(),
  wouldUseAs: wouldUseAsSchema.optional(),
});

const exportSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  filters: filtersSchema.default({}),
});

const createInviteCodeSchema = z.object({
  label: z.string().trim().max(120).optional().default(""),
  maxUses: z.number().int().min(1).max(500).default(1),
  expiresAt: z.string().trim().max(40).optional().default(""),
});

type ExportFilters = z.infer<typeof filtersSchema>;
type CreateInviteCodeInput = z.infer<typeof createInviteCodeSchema>;

function getDb(): Firestore {
  return getFirestore(DATABASE_ID);
}

function inviteCodesCollection(db: Firestore) {
  return db
    .collection(ACCESS_COLLECTION)
    .doc(INVITE_CODES_DOC)
    .collection("codes");
}

function getOwnerUid(): string {
  const ownerUid = OWNER_UID.value().trim();
  if (!ownerUid) {
    throw new HttpsError("failed-precondition", "OWNER_UID saknas.");
  }

  return ownerUid;
}

function assertAdmin(request: CallableRequest<unknown>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login krävs.");
  }

  if (request.auth.uid !== getOwnerUid()) {
    throw new HttpsError("permission-denied", "Endast ägare.");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function getNestedRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return asRecord(value[key]);
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function serializeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      serializeValue(entry),
    ]),
  );
}

function getTimestampIso(record: Record<string, unknown>): string {
  const timestamp = record.timestamp;
  const serialized = serializeValue(timestamp);
  return typeof serialized === "string" ? serialized : "";
}

function getOptionalTimestampIso(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const serialized = serializeValue(record[key]);
  return typeof serialized === "string" ? serialized : undefined;
}

function readPositiveNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = getNumber(record[key]);
  return value !== null && Number.isFinite(value) && value > 0 ?
    value :
    fallback;
}

function readNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = getNumber(record[key]);
  return value !== null && Number.isFinite(value) && value >= 0 ?
    value :
    fallback;
}

function randomInviteSegment(length: number): string {
  let segment = "";
  for (let index = 0; index < length; index += 1) {
    segment += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }

  return segment;
}

function generateInviteCode(): string {
  return [
    randomInviteSegment(4),
    randomInviteSegment(4),
    randomInviteSegment(4),
  ].join("-");
}

function parseExpiresAt(value: string): Date | null {
  if (!value) {
    return null;
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const date = dateOnlyPattern.test(value) ?
    new Date(`${value}T23:59:59.999Z`) :
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new HttpsError(
      "invalid-argument",
      "Utgångsdatumet har ogiltigt format.",
    );
  }

  return date;
}

function toInviteCodeSummary(doc: DocumentSnapshot) {
  const data = asRecord(serializeValue(doc.data()));
  const label = getString(data.label) || getString(data.note);

  return {
    id: doc.id,
    code: getString(data.code),
    label,
    maxUses: readPositiveNumber(data, "maxUses", 1),
    useCount: readNonNegativeNumber(data, "useCount", 0),
    createdAt: getOptionalTimestampIso(data, "createdAt"),
    expiresAt: getOptionalTimestampIso(data, "expiresAt"),
    usedAt: getOptionalTimestampIso(data, "usedAt"),
  };
}

async function createUniqueInviteCode(
  db: Firestore,
  input: CreateInviteCodeInput,
  createdBy: string,
) {
  const expiresAt = parseExpiresAt(input.expiresAt);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const docRef = inviteCodesCollection(db).doc(code);
    const existing = await docRef.get();
    if (existing.exists) {
      continue;
    }

    await docRef.set({
      code,
      label: input.label,
      maxUses: input.maxUses,
      useCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
      ...(expiresAt ? { expiresAt } : {}),
    });

    const created = await docRef.get();
    return toInviteCodeSummary(created);
  }

  throw new HttpsError("internal", "Kunde inte skapa en unik promokod.");
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

function toCsv(records: Array<Record<string, unknown>>): string {
  const headers = [
    "id",
    "timestamp",
    "designId",
    "usefulness",
    "wouldUseAs",
    "pitfalls",
    "editsBeforeUse",
  ];
  const rows = records.map((record) => {
    const feedback = getNestedRecord(record, "feedback");
    const overall = getNestedRecord(feedback, "overall");
    return [
      record.id,
      getTimestampIso(record),
      record.designId,
      overall.usefulness,
      feedback.wouldUseAs,
      getStringArray(feedback.pitfallsIdentified).join("; "),
      feedback.editsBeforeUse,
    ].map(csvEscape).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function passesClientFilters(
  record: Record<string, unknown>,
  filters: ExportFilters,
): boolean {
  const feedback = getNestedRecord(record, "feedback");
  const pitfalls = getStringArray(feedback.pitfallsIdentified);
  const wouldUseAs = getString(feedback.wouldUseAs);

  if (filters.pitfall && !pitfalls.includes(filters.pitfall)) {
    return false;
  }

  if (filters.wouldUseAs && wouldUseAs !== filters.wouldUseAs) {
    return false;
  }

  return true;
}

function summarizeFeedback(records: Array<Record<string, unknown>>) {
  const usefulnessDistribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  const pitfallDistribution: Record<string, number> = {};
  let usefulnessSum = 0;
  let usefulnessCount = 0;

  for (const record of records) {
    const feedback = getNestedRecord(record, "feedback");
    const overall = getNestedRecord(feedback, "overall");
    const usefulness = getNumber(overall.usefulness);
    if (usefulness !== null) {
      usefulnessSum += usefulness;
      usefulnessCount += 1;
      usefulnessDistribution[String(usefulness)] =
        (usefulnessDistribution[String(usefulness)] ?? 0) + 1;
    }

    for (const pitfall of getStringArray(feedback.pitfallsIdentified)) {
      pitfallDistribution[pitfall] = (pitfallDistribution[pitfall] ?? 0) + 1;
    }
  }

  return {
    averageUsefulness:
      usefulnessCount > 0
        ? Math.round((usefulnessSum / usefulnessCount) * 10) / 10
        : null,
    usefulnessDistribution,
    pitfallDistribution,
  };
}

export const isAdmin = onCall(
  { region: "europe-west1", secrets: [OWNER_UID] },
  async (request) => {
    if (!request.auth) {
      return { isAdmin: false };
    }

    return { isAdmin: request.auth.uid === getOwnerUid() };
  },
);

export const getAdminStats = onCall(
  { region: "europe-west1", secrets: [OWNER_UID] },
  async (request) => {
    assertAdmin(request);

    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      designsSnapshot,
      feedbackSnapshot,
      telemetrySnapshot,
      inviteCodesSnapshot,
    ] =
      await Promise.all([
        db.collectionGroup("designs").get(),
        db.collection("feedback").orderBy("timestamp", "desc").get(),
        db
          .collection("telemetry")
          .where("timestamp", ">=", sevenDaysAgo)
          .get(),
        inviteCodesCollection(db).orderBy("createdAt", "desc").limit(25).get(),
      ]);

    const feedbackRecords = feedbackSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...asRecord(serializeValue(doc.data())),
    }));
    const summary = summarizeFeedback(feedbackRecords);

    return {
      totalDesigns: designsSnapshot.size,
      totalFeedback: feedbackSnapshot.size,
      last7DaysActivity: telemetrySnapshot.size,
      averageUsefulness: summary.averageUsefulness,
      usefulnessDistribution: summary.usefulnessDistribution,
      pitfallDistribution: summary.pitfallDistribution,
      feedbackRecords: feedbackRecords.slice(0, 200),
      inviteCodes: inviteCodesSnapshot.docs.map(toInviteCodeSummary),
    };
  },
);

export const createInviteCode = onCall(
  { region: "europe-west1", secrets: [OWNER_UID] },
  async (request) => {
    assertAdmin(request);

    const parsed = createInviteCodeSchema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        "Promokoden kunde inte skapas. Kontrollera fälten.",
      );
    }

    const inviteCode = await createUniqueInviteCode(
      getDb(),
      parsed.data,
      request.auth?.uid ?? "unknown",
    );

    return { inviteCode };
  },
);

export const exportFeedback = onCall(
  { region: "europe-west1", secrets: [OWNER_UID] },
  async (request) => {
    assertAdmin(request);

    const { format, filters } = exportSchema.parse(request.data ?? {});
    const db = getDb();
    let query: Query = db.collection("feedback");

    if (filters.fromDate) {
      query = query.where("timestamp", ">=", new Date(filters.fromDate));
    }

    if (filters.toDate) {
      query = query.where("timestamp", "<=", new Date(filters.toDate));
    }

    if (filters.minUsefulness) {
      query = query.where(
        "feedback.overall.usefulness",
        ">=",
        filters.minUsefulness,
      );
    }

    const snapshot = await query.get();
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, ...asRecord(serializeValue(doc.data())) }))
      .filter((record) => passesClientFilters(record, filters));

    if (format === "csv") {
      return { format: "csv", content: toCsv(records) };
    }

    return { format: "json", content: JSON.stringify(records, null, 2) };
  },
);
