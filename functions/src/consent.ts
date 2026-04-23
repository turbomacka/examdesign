import { type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const CURRENT_CONSENT_VERSION = 1;

interface ConsentState {
  telemetryAccepted?: boolean;
  feedbackInformedAccepted?: boolean;
  contactAccepted?: boolean;
  consentVersion?: number;
}

export async function verifyConsent(
  db: Firestore,
  uid: string,
): Promise<void> {
  const doc = await db.doc(`users/${uid}/consent/current`).get();
  if (!doc.exists) {
    throw new HttpsError("failed-precondition", "Samtycke krävs.");
  }

  const data = doc.data() as ConsentState;
  if (!data.telemetryAccepted || !data.feedbackInformedAccepted) {
    throw new HttpsError("failed-precondition", "Samtycke krävs.");
  }

  if (
    typeof data.consentVersion !== "number" ||
    data.consentVersion < CURRENT_CONSENT_VERSION
  ) {
    throw new HttpsError("failed-precondition", "Förnyat samtycke krävs.");
  }
}
