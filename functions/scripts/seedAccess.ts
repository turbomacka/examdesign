import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const DATABASE_ID = "examdesign";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toEmailDocId(email: string): string {
  return normalizeEmail(email)
    .replaceAll("@", "_at_")
    .replaceAll(".", "_")
    .replaceAll("/", "_slash_");
}

async function seed(email: string): Promise<void> {
  initializeApp();
  const normalizedEmail = normalizeEmail(email);
  const db = getFirestore(DATABASE_ID);

  await db
    .collection("accessControl")
    .doc("allowedEmails")
    .collection("emails")
    .doc(toEmailDocId(normalizedEmail))
    .set(
      {
        email: normalizedEmail,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: "seed",
        note: "Initial seed",
      },
      { merge: true },
    );

  console.log(`Lade till ${normalizedEmail} i allowlist`);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run seed:access -- <email>");
  process.exit(1);
}

seed(email).then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
