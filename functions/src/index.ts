import { existsSync } from "node:fs";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { defineSecret, type SecretParam } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { z } from "zod";

import { verifyAccess } from "./access";
import { verifyConsent } from "./consent";
import { type ExamDesignResult } from "./schema";
import {
  estimateCostUsd,
  hashUid,
  TELEMETRY_SALT,
  writeTelemetry,
} from "./telemetry";

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

const db = getFirestore("examdesign");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OPENAI_MODEL = defineSecret("OPENAI_MODEL");

const optionalLongText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(10).max(5000).optional());

const optionalCourseContext = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().max(1000).optional());

const examDesignInputSchema = z.object({
  learningOutcomes: z.string().trim().min(10).max(5000),
  level: z.enum(["grund", "avancerad", "forskar"]),
  subject: z.string().trim().min(2).max(5000),
  courseContext: optionalCourseContext,
  existingExamination: optionalLongText,
  constraints: optionalLongText,
});

type ExamDesignInput = z.infer<typeof examDesignInputSchema>;

function sanitizeInputForStorage(input: ExamDesignInput) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function buildUserPrompt(input: ExamDesignInput): string {
  const sections = [
    `Larandemal:\n${input.learningOutcomes}`,
    `Niva:\n${input.level}`,
    `Amne:\n${input.subject}`,
    `Kurskontext:\n${input.courseContext ?? "Inte angiven."}`,
    `Befintlig examination:\n${input.existingExamination ?? "Ingen beskriven."}`,
    `Begransningar:\n${input.constraints ?? "Inga begransningar angivna."}`,
    "Instruktion:\nTa fram ett examinationsforslag enligt ramverket produkt-process-agens. Om underlaget ar otillrackligt ska du formulera behov av klargoranden i faltet openQuestions i stallet for att gissa.",
  ];

  return sections.join("\n\n");
}

function readOptionalSecret(secret: SecretParam): string | undefined {
  try {
    const value = secret.value().trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function ensureSecret(secret: SecretParam): string {
  try {
    const value = secret.value().trim();
    if (value.length === 0) {
      throw new Error("Tom secret.");
    }

    return value;
  } catch (error) {
    logger.error("openai_secret_missing", { error: toErrorMessage(error) });
    throw new HttpsError(
      "internal",
      "OpenAI-konfiguration saknas i Firebase Secrets.",
    );
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function upsertUserDocument(uid: string, authToken: Record<string, unknown>) {
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();
  const email = typeof authToken.email === "string" ? authToken.email : "";
  const displayName =
    typeof authToken.name === "string"
      ? authToken.name
      : email || "Okand anvandare";

  const payload: Record<string, unknown> = {
    email,
    displayName,
    lastActive: FieldValue.serverTimestamp(),
  };

  if (!snapshot.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await userRef.set(payload, { merge: true });
}

async function storeDesign(
  uid: string,
  input: ExamDesignInput,
  output: ExamDesignResult,
  model: string,
  tokensUsed: { input: number; output: number },
) {
  const designRef = db.collection("users").doc(uid).collection("designs").doc();
  await designRef.set({
    createdAt: FieldValue.serverTimestamp(),
    input: sanitizeInputForStorage(input),
    output,
    model,
    tokensUsed,
  });

  return designRef.id;
}

function httpStatusForError(error: unknown): number {
  if (!(error instanceof HttpsError)) {
    return 500;
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

  const message = toErrorMessage(error).toLowerCase();
  if (message.includes("schema") || message.includes("json")) {
    return "schema_mismatch";
  }

  if (message.includes("openai") || message.includes("responses api")) {
    return "openai_error";
  }

  return "internal_error";
}

async function writeGenerateTelemetry(params: {
  uid: string;
  startedAt: number;
  model: string;
  tokensUsed: { input: number; output: number };
  schemaValidationPassed: boolean;
  error: unknown | null;
}) {
  try {
    await writeTelemetry(db, {
      uidHash: hashUid(params.uid),
      function: "generateExamDesign",
      model: params.model,
      latencyMs: Date.now() - params.startedAt,
      tokensInput: params.tokensUsed.input,
      tokensOutput: params.tokensUsed.output,
      estimatedCostUsd: estimateCostUsd(
        params.model,
        params.tokensUsed.input,
        params.tokensUsed.output,
      ),
      schemaValidationPassed: params.schemaValidationPassed,
      httpStatus: params.error ? httpStatusForError(params.error) : 200,
      errorType: params.error ? telemetryErrorType(params.error) : null,
    });
  } catch (error) {
    logger.warn("telemetry_write_failed", {
      function: "generateExamDesign",
      error: toErrorMessage(error),
    });
  }
}

export const generateExamDesign = onCall(
  {
    region: "europe-west1",
    secrets: [OPENAI_API_KEY, OPENAI_MODEL, TELEMETRY_SALT],
    timeoutSeconds: 240,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Du maste vara inloggad for att skapa ett examinationsforslag.",
      );
    }

    const startedAt = Date.now();
    const uid = request.auth.uid;
    let modelUsed = readOptionalSecret(OPENAI_MODEL) ?? "gpt-5.4";
    let tokensUsed = { input: 0, output: 0 };

    try {
      await verifyAccess(db, request.auth.token.email);
      await verifyConsent(db, uid);
      const input = examDesignInputSchema.parse(request.data);
      const [openaiModule, promptsModule, schemaModule] = await Promise.all([
        import("./openai.js"),
        import("./prompts.js"),
        import("./schema.js"),
      ]);
      const validateResult: (value: unknown) => asserts value is ExamDesignResult =
        schemaModule.validateExamDesignResult;

      modelUsed = openaiModule.resolveConfiguredModel(
        readOptionalSecret(OPENAI_MODEL),
      );
      const schema = schemaModule.getExamDesignJsonSchema();
      const promptPackage = promptsModule.getPromptPackage(input);
      const result = await openaiModule.generateStructuredExamDesign({
        apiKey: ensureSecret(OPENAI_API_KEY),
        model: modelUsed,
        systemPrompt: promptPackage.systemPrompt,
        userPrompt: buildUserPrompt(input),
        schema,
      });
      modelUsed = result.model;
      tokensUsed = result.tokensUsed;

      validateResult(result.output);

      await upsertUserDocument(uid, request.auth.token);
      const designId = await storeDesign(
        uid,
        input,
        result.output,
        result.model,
        result.tokensUsed,
      );

      logger.info("generate_exam_design_completed", {
        uid: request.auth.uid,
        model: result.model,
        inputTokens: result.tokensUsed.input,
        outputTokens: result.tokensUsed.output,
        referencesUsed: promptPackage.references.length,
        examplesUsed: promptPackage.examples.length,
        promptBundlePresent: existsSync("prompts"),
      });

      await writeGenerateTelemetry({
        uid,
        startedAt,
        model: modelUsed,
        tokensUsed,
        schemaValidationPassed: true,
        error: null,
      });

      return {
        designId,
        result: result.output,
      };
    } catch (error) {
      await writeGenerateTelemetry({
        uid,
        startedAt,
        model: modelUsed,
        tokensUsed,
        schemaValidationPassed: false,
        error,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        throw new HttpsError(
          "invalid-argument",
          "Indatan ar inte giltig. Kontrollera att varje falt ar ifyllt korrekt.",
        );
      }

      logger.error("generate_exam_design_failed", {
        uid: request.auth.uid,
        error: toErrorMessage(error),
      });

      throw new HttpsError(
        "internal",
        "Kunde inte skapa examinationsforslaget just nu.",
      );
    }
  },
);

export {
  createInviteCode,
  exportFeedback,
  getAdminStats,
  isAdmin,
} from "./admin";
export { checkAccess, redeemInviteCode } from "./access";
export { submitFeedback } from "./feedback";
