import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const projectDir = path.resolve(webDir, "..");
const sourceFile = path.join(projectDir, "about-content", "about.md");
const targetDir = path.join(webDir, "public", "content");
const targetFile = path.join(targetDir, "about.md");

mkdirSync(targetDir, { recursive: true });
copyFileSync(sourceFile, targetFile);

console.log(
  `Synkade ${path.relative(projectDir, sourceFile)} -> ${path.relative(projectDir, targetFile)}`,
);
