import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const DATABASE_ID = "examdesign";
const ACCESS_COLLECTION = "accessControl";
const ALLOWED_EMAILS_DOC = "allowedEmails";
const INVITE_CODES_DOC = "inviteCodes";

type AccessDeniedReason =
  | "not_authenticated"
  | "no_email"
  | "not_on_allowlist";

interface CheckAccessResponse {
  allowed: boolean;
  reason?: AccessDeniedReason;
}

function getDb(): Firestore {
  return getFirestore(DATABASE_ID);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toEmailDocId(email: string): string {
  // Deterministic IDs make invite redemption idempotent and avoid duplicates.
  // The query-based read path still supports manually added auto-ID documents.
  return normalizeEmail(email)
    .replaceAll("@", "_at_")
    .replaceAll(".", "_")
    .replaceAll("/", "_slash_");
}

function allowedEmailsCollection(db: Firestore) {
  return db
    .collection(ACCESS_COLLECTION)
    .doc(ALLOWED_EMAILS_DOC)
    .collection("emails");
}

function inviteCodesCollection(db: Firestore) {
  return db
    .collection(ACCESS_COLLECTION)
    .doc(INVITE_CODES_DOC)
    .collection("codes");
}

async function hasAllowedEmail(
  db: Firestore,
  email: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await allowedEmailsCollection(db)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  return !snapshot.empty;
}

function readPositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ?
    value :
    fallback;
}

function readNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ?
    value :
    fallback;
}

export async function verifyAccess(
  db: Firestore,
  email: string | undefined,
): Promise<void> {
  if (!email) {
    throw new HttpsError("permission-denied", "Ingen åtkomst.");
  }

  const allowed = await hasAllowedEmail(db, email);
  if (!allowed) {
    throw new HttpsError(
      "permission-denied",
      "Ditt konto har inte åtkomst till testfasen.",
    );
  }
}

export const checkAccess = onCall(
  { region: "europe-west1" },
  async (request): Promise<CheckAccessResponse> => {
    if (!request.auth) {
      return { allowed: false, reason: "not_authenticated" };
    }

    const email = request.auth.token.email;
    if (typeof email !== "string" || email.trim().length === 0) {
      return { allowed: false, reason: "no_email" };
    }

    const allowed = await hasAllowedEmail(getDb(), email);
    if (allowed) {
      return { allowed: true };
    }

    return { allowed: false, reason: "not_on_allowlist" };
  },
);

export const redeemInviteCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login krävs.");
    }

    const rawCode = (request.data as { code?: unknown } | undefined)?.code;
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    if (code.length === 0 || code.length > 120) {
      throw new HttpsError("invalid-argument", "Kod saknas.");
    }

    const rawEmail = request.auth.token.email;
    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      throw new HttpsError("failed-precondition", "Email saknas i token.");
    }

    const db = getDb();
    const email = normalizeEmail(rawEmail);
    const uid = request.auth.uid;

    if (await hasAllowedEmail(db, email)) {
      return { success: true, alreadyAllowed: true };
    }

    return db.runTransaction(async (tx) => {
      const codeQuery = await tx.get(
        inviteCodesCollection(db).where("code", "==", code).limit(1),
      );

      if (codeQuery.empty) {
        throw new HttpsError("not-found", "Ogiltig kod.");
      }

      const codeDoc = codeQuery.docs[0];
      const data = codeDoc.data();
      const expiresAt = data.expiresAt;
      const expiresDate =
        expiresAt && typeof expiresAt.toDate === "function" ?
          expiresAt.toDate() :
          null;

      if (expiresDate && expiresDate.getTime() < Date.now()) {
        throw new HttpsError("failed-precondition", "Koden har gått ut.");
      }

      const maxUses = readPositiveInteger(data.maxUses, 1);
      const useCount = readNonNegativeInteger(data.useCount, 0);
      if (useCount >= maxUses) {
        throw new HttpsError("failed-precondition", "Koden är förbrukad.");
      }

      const emailDoc = allowedEmailsCollection(db).doc(toEmailDocId(email));
      tx.set(
        emailDoc,
        {
          email,
          addedAt: FieldValue.serverTimestamp(),
          addedBy: uid,
          note: `Via invite-kod ${code.substring(0, 4)}...`,
        },
        { merge: true },
      );

      tx.update(codeDoc.ref, {
        useCount: useCount + 1,
        usedAt: FieldValue.serverTimestamp(),
        usedBy: uid,
      });

      return { success: true, alreadyAllowed: false };
    });
  },
);
