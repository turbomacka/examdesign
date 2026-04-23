import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type Level = "grund" | "avancerad" | "forskar";

interface PromptLookupInput {
  learningOutcomes: string;
  level: Level;
  subject: string;
  courseContext?: string;
  existingExamination?: string;
  constraints?: string;
}

interface PromptIndexEntry {
  filename: string;
  tags: string[];
  dimensions: string[];
  body: string;
}

interface PromptCache {
  coreSystemPrompt: string;
  examples: PromptIndexEntry[];
  references: PromptIndexEntry[];
}

interface RetrievalSignals {
  tags: string[];
  dimensions: string[];
}

interface RankedEntry extends PromptIndexEntry {
  score: number;
}

export interface PromptPackage {
  systemPrompt: string;
  references: PromptIndexEntry[];
  examples: PromptIndexEntry[];
}

let cachedPrompts: PromptCache | null = null;

const DIMENSION_KEYWORDS: Record<string, "produkt" | "process" | "agens"> = {
  produkt: "produkt",
  artefakt: "produkt",
  slutprodukt: "produkt",
  analys: "produkt",
  rapport: "produkt",
  process: "process",
  feedback: "process",
  aterkoppling: "process",
  peer: "process",
  revision: "process",
  agens: "agens",
  beslut: "agens",
  osakerhet: "agens",
  sjalvstandig: "agens",
  val: "agens",
};

function resolvePromptsRoot(): string {
  const candidates = [
    path.resolve(__dirname, "../prompts"),
    path.resolve(process.cwd(), "prompts"),
    path.resolve(process.cwd(), "../prompts"),
  ];

  const resolved = candidates.find((candidate) =>
    existsSync(path.join(candidate, "core")),
  );

  if (!resolved) {
    throw new Error("Kunde inte hitta prompts-katalogen.");
  }

  return resolved;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? item.split(",") : [],
      )
      .map((item) => normalizeText(item.trim()))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => normalizeText(item.trim()))
      .filter(Boolean);
  }

  return [];
}

function readCorePrompt(promptsRoot: string): string {
  const coreDir = path.join(promptsRoot, "core");
  const coreFiles = readdirSync(coreDir)
    .filter((filename) => filename.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "sv"));

  return coreFiles
    .map((filename) =>
      readFileSync(path.join(coreDir, filename), "utf8").trim(),
    )
    .join("\n\n");
}

function readIndexedDirectory(directoryPath: string): PromptIndexEntry[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .filter((filename) => filename.endsWith(".md"))
    .filter((filename) => !filename.startsWith("_"))
    .filter((filename) => !filename.toLowerCase().startsWith("readme"))
    .sort((left, right) => left.localeCompare(right, "sv"))
    .map((filename) => {
      const raw = readFileSync(path.join(directoryPath, filename), "utf8");
      const parsed = matter(raw);

      return {
        filename,
        tags: normalizeStringList(parsed.data.tags),
        dimensions: normalizeStringList(parsed.data.dimensions),
        body: parsed.content.trim(),
      };
    });
}

function loadPromptCache(): PromptCache {
  if (cachedPrompts) {
    return cachedPrompts;
  }

  const promptsRoot = resolvePromptsRoot();
  cachedPrompts = {
    coreSystemPrompt: readCorePrompt(promptsRoot),
    examples: readIndexedDirectory(path.join(promptsRoot, "examples")),
    references: readIndexedDirectory(path.join(promptsRoot, "references")),
  };

  return cachedPrompts;
}

function extractSignals(input: PromptLookupInput): RetrievalSignals {
  const tags = new Set<string>([input.level]);
  const dimensions = new Set<string>();
  const textSources = [
    input.subject,
    input.learningOutcomes,
    input.courseContext,
    input.existingExamination,
    input.constraints,
  ].filter((value): value is string => typeof value === "string");

  for (const source of textSources) {
    for (const token of tokenize(source)) {
      tags.add(token);

      const dimension = DIMENSION_KEYWORDS[token];
      if (dimension) {
        dimensions.add(dimension);
      }
    }
  }

  return {
    tags: [...tags],
    dimensions: [...dimensions],
  };
}

function scoreEntry(
  entry: PromptIndexEntry,
  signals: RetrievalSignals,
): RankedEntry {
  const tagHits = entry.tags.filter((tag) => signals.tags.includes(tag)).length;
  const dimensionHits = entry.dimensions.filter((dimension) =>
    signals.dimensions.includes(dimension),
  ).length;

  return {
    ...entry,
    score: tagHits * 4 + dimensionHits * 3,
  };
}

function rankEntries(
  entries: PromptIndexEntry[],
  signals: RetrievalSignals,
  limit: number,
): PromptIndexEntry[] {
  return entries
    .map((entry) => scoreEntry(entry, signals))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.filename.localeCompare(right.filename, "sv");
    })
    .slice(0, limit)
    .map(({ score: _score, ...entry }) => entry);
}

function formatContextSection(title: string, entries: PromptIndexEntry[]): string {
  return [
    `## ${title}`,
    ...entries.map((entry) => {
      const metaLines = [
        entry.tags.length > 0 ? `Taggar: ${entry.tags.join(", ")}` : undefined,
        entry.dimensions.length > 0
          ? `Dimensioner: ${entry.dimensions.join(", ")}`
          : undefined,
      ].filter((value): value is string => Boolean(value));

      return [
        `### ${entry.filename}`,
        metaLines.join("\n"),
        entry.body,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n\n");
}

export function getPromptPackage(input: PromptLookupInput): PromptPackage {
  const promptCache = loadPromptCache();
  const signals = extractSignals(input);

  // Denna retrieval ar avsiktligt deterministisk. Den kan senare ersattas
  // av vektorsokning utan att anropskontraktet mot funktionen andras.
  const references = rankEntries(promptCache.references, signals, 3);
  const examples = rankEntries(promptCache.examples, signals, 2);

  const sections = [promptCache.coreSystemPrompt];

  if (references.length > 0) {
    sections.push(formatContextSection("Tillampliga referenser", references));
  }

  if (examples.length > 0) {
    sections.push(formatContextSection("Orienterande exempel", examples));
  }

  return {
    systemPrompt: sections.join("\n\n"),
    references,
    examples,
  };
}
