import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";

import { verifyAccess } from "./access";
import { verifyConsent } from "./consent";
import {
  hashUid,
  TELEMETRY_SALT,
  writeTelemetry,
} from "./telemetry";

const pitfallSchema = z.enum([
  "pseudo_agens",
  "dokumentationsfetisch",
  "vardering",
  "taxonomi_dominans",
  "pseudo_autenticitet",
  "triptyk_tvang",
  "annan",
]);

const dimensionFeedbackSchema = z.object({
  levelReasonable: z.boolean().nullable(),
  inferenceBears: z.boolean().nullable(),
  comment: z.string().trim().max(1000),
});

const submitFeedbackSchema = z.object({
  designId: z.string().trim().min(1).max(200),
  overall: z.object({
    usefulness: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    freetext: z.string().trim().max(2000),
  }),
  dimensions: z.object({
    product: dimensionFeedbackSchema.nullable(),
    process: dimensionFeedbackSchema.nullable(),
    agency: dimensionFeedbackSchema.nullable(),
  }),
  pitfallsIdentified: z.array(pitfallSchema).max(7),
  pitfallsOther: z.string().trim().max(500),
  editsBeforeUse: z.string().trim().max(2000),
  wouldUseAs: z.enum(["som_ar", "mindre_just", "stora_just", "nej"]),
  contactConsent: z.boolean(),
});

type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function httpStatusForError(error: unknown): number {
  if (!(error instanceof HttpsError)) {
    return error instanceof z.ZodError ? 400 : 500;
  }

  const statusByCode: Record<string, number> = {
    "invalid-argument": 400,
    "unauthenticated": 401,
    "permission-denied": 403,
    "not-found": 404,
    "failed-precondition": 412,
    "internal": 500,
    "unavailable": 503,
  };

  return statusByCode[error.code] ?? 500;
}

function telemetryErrorType(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "validation_error";
  }

  if (error instanceof HttpsError) {
    if (error.code === "failed-precondition") {
      return "consent_missing";
    }

    return error.code;
  }

  return "internal_error";
}

async function writeSubmitFeedbackTelemetry(params: {
  uid: string;
  startedAt: number;
  error: unknown | null;
}) {
  try {
    await writeTelemetry(getFirestore("examdesign"), {
      uidHash: hashUid(params.uid),
      function: "submitFeedback",
      model: "n/a",
      latencyMs: Date.now() - params.startedAt,
      tokensInput: 0,
      tokensOutput: 0,
      estimatedCostUsd: 0,
      schemaValidationPassed: params.error === null,
      httpStatus: params.error ? httpStatusForError(params.error) : 200,
      errorType: params.error ? telemetryErrorType(params.error) : null,
    });
  } catch (error) {
    logger.warn("telemetry_write_failed", {
      function: "submitFeedback",
      error: toErrorMessage(error),
    });
  }
}

async function storeFeedback(
  uid: string,
  input: SubmitFeedbackInput,
): Promise<string> {
  const db = getFirestore("examdesign");
  const designRef = db
    .collection("users")
    .doc(uid)
    .collection("designs")
    .doc(input.designId);
  const designSnapshot = await designRef.get();

  if (!designSnapshot.exists) {
    throw new HttpsError("permission-denied", "Designförslaget saknas.");
  }

  const feedbackRef = await db.collection("feedback").add({
    timestamp: FieldValue.serverTimestamp(),
    uidHash: hashUid(uid),
    designId: input.designId,
    designSnapshot: designSnapshot.data(),
    feedback: input,
    contactUid: input.contactConsent ? uid : null,
  });

  return feedbackRef.id;
}

export const submitFeedback = onCall(
  {
    region: "europe-west1",
    secrets: [TELEMETRY_SALT],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login krävs.");
    }

    const startedAt = Date.now();
    const uid = request.auth.uid;

    try {
      const db = getFirestore("examdesign");
      await verifyAccess(db, request.auth.token.email);
      await verifyConsent(db, uid);
      const input = submitFeedbackSchema.parse(request.data);
      const feedbackId = await storeFeedback(uid, input);

      await writeSubmitFeedbackTelemetry({
        uid,
        startedAt,
        error: null,
      });

      logger.info("submit_feedback_completed", {
        uid,
        designId: input.designId,
        feedbackId,
      });

      return { feedbackId };
    } catch (error) {
      await writeSubmitFeedbackTelemetry({
        uid,
        startedAt,
        error,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        throw new HttpsError(
          "invalid-argument",
          "Återkopplingen är inte giltig. Kontrollera fälten.",
        );
      }

      logger.error("submit_feedback_failed", {
        uid,
        error: toErrorMessage(error),
      });

      throw new HttpsError(
        "internal",
        "Kunde inte spara återkopplingen just nu.",
      );
    }
  },
);
