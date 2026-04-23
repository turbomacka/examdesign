import { createHash } from "node:crypto";
import {
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";

export const TELEMETRY_SALT = defineSecret("TELEMETRY_SALT");

export type TelemetryFunction = "generateExamDesign" | "submitFeedback";

export interface TelemetryRecord {
  timestamp: FieldValue;
  uidHash: string;
  function: TelemetryFunction;
  model: string;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostUsd: number;
  schemaValidationPassed: boolean;
  httpStatus: number;
  errorType: string | null;
}

// Priser per miljon tokens. Uppdatera när modellpriser ändras.
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.50, output: 15.00 },
  "gpt-5.4-mini": { input: 0.25, output: 2.00 },
  "gpt-5.4-nano": { input: 0.05, output: 0.40 },
};

export function hashUid(uid: string): string {
  const salt = TELEMETRY_SALT.value().trim();
  if (!salt) {
    throw new Error("TELEMETRY_SALT inte satt.");
  }

  return createHash("sha256")
    .update(uid + salt)
    .digest("hex")
    .slice(0, 16);
}

export function estimateCostUsd(
  model: string,
  tokensInput: number,
  tokensOutput: number,
): number {
  const prices = MODEL_PRICES[model];
  if (!prices) {
    return 0;
  }

  const cost =
    (tokensInput / 1_000_000) * prices.input +
    (tokensOutput / 1_000_000) * prices.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export async function writeTelemetry(
  db: Firestore,
  record: Omit<TelemetryRecord, "timestamp">,
): Promise<void> {
  await db.collection("telemetry").add({
    ...record,
    timestamp: FieldValue.serverTimestamp(),
  });
}
