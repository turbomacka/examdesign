import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const PROJECT_ID = "examdesign";
const DATABASE_ID = "examdesign";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function toEmailDocId(email) {
  return normalizeEmail(email)
    .replaceAll("@", "_at_")
    .replaceAll(".", "_")
    .replaceAll("/", "_slash_");
}

function getConfigCandidates() {
  return [
    path.join(homedir(), ".config", "configstore", "firebase-tools.json"),
    process.env.APPDATA ?
      path.join(process.env.APPDATA, "configstore", "firebase-tools.json") :
      null,
    process.env.LOCALAPPDATA ?
      path.join(process.env.LOCALAPPDATA, "configstore", "firebase-tools.json") :
      null,
  ].filter(Boolean);
}

function refreshFirebaseToken() {
  spawnSync(
    "firebase",
    ["projects:list", "--json", "--non-interactive"],
    { stdio: "ignore" },
  );
}

function readFirebaseAccessToken() {
  refreshFirebaseToken();

  for (const candidate of getConfigCandidates()) {
    if (!existsSync(candidate)) {
      continue;
    }

    const config = JSON.parse(readFileSync(candidate, "utf8"));
    const token = config.tokens?.access_token;
    if (typeof token === "string" && token.length > 0) {
      return token;
    }
  }

  throw new Error(
    "Kunde inte hitta Firebase CLI-token. Kör `firebase login` och försök igen.",
  );
}

async function seed(email) {
  const normalizedEmail = normalizeEmail(email);
  const docId = toEmailDocId(normalizedEmail);
  const accessToken = readFirebaseAccessToken();
  const url = [
    "https://firestore.googleapis.com/v1/projects",
    PROJECT_ID,
    "databases",
    DATABASE_ID,
    "documents/accessControl/allowedEmails/emails",
    docId,
  ].join("/");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        email: { stringValue: normalizedEmail },
        addedAt: { timestampValue: new Date().toISOString() },
        addedBy: { stringValue: "seed" },
        note: { stringValue: "Initial seed" },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore REST ${response.status}: ${await response.text()}`);
  }

  console.log(`Lade till ${normalizedEmail} i allowlist (${docId})`);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run seed:access -- <email>");
  process.exit(1);
}

seed(email).then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
