import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(scriptDir, "..");
const sourceDir = path.resolve(functionsDir, "..", "prompts");
const targetDir = path.resolve(functionsDir, "prompts");

if (!existsSync(sourceDir)) {
  throw new Error(`Prompts-katalogen saknas: ${sourceDir}`);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });
