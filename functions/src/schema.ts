import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";

export interface ExamDesignResult {
  summary: string;
  context: {
    subject: string;
    level: "grund" | "avancerad" | "forskar";
    learningOutcomes: string[];
    courseContext: string;
    constraints: string[];
  };
  artefact: {
    name: string;
    description: string;
    rationale: string;
  };
  productDimension: {
    included: boolean;
    rationale: string;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
    taxonomySupport: string | null;
  };
  processDimension: {
    included: boolean;
    rationale: string;
    level: "operativ" | "återkopplings" | "disciplinär" | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
  };
  agencyDimension: {
    included: boolean;
    rationale: string;
    level: "individuell" | "relationell" | "epistemisk" | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
    interrogativeElement: string | null;
  };
  complementaryEvidence: Array<{
    type: string;
    purpose: string;
    specification: string;
  }>;
  inferenceCheck: {
    passes: boolean;
    reasoning: string;
    revisions: string | null;
  };
  programmaticSuggestions: string | null;
  pitfallsAvoided: string[];
  openQuestions: Array<string | null>;
}

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
});

let cachedSchema: Record<string, unknown> | null = null;
let validator = ajv.compile<ExamDesignResult>({
  type: "object",
  properties: {},
});

function resolveSchemaMarkdownPath(): string {
  const candidates = [
    path.resolve(__dirname, "../prompts/core/20_output_schema.md"),
    path.resolve(process.cwd(), "prompts/core/20_output_schema.md"),
    path.resolve(process.cwd(), "../prompts/core/20_output_schema.md"),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error("Kunde inte hitta 20_output_schema.md.");
  }

  return resolved;
}

function extractCodeBlock(markdown: string): string {
  const match = markdown.match(/```json\s*([\s\S]*?)```/i);
  if (!match) {
    throw new Error("Schemafilen saknar JSON-kodblock.");
  }

  return match[1];
}

function assertMarkdownMatchesSchema(markdown: string, schema: Record<string, unknown>) {
  const codeBlock = extractCodeBlock(markdown);
  const markdownKeys = [...codeBlock.matchAll(/^\s*"([^"]+)":/gm)].map(
    (match) => match[1],
  );
  const schemaProperties = schema.properties as Record<string, unknown>;
  const schemaKeys = Object.keys(schemaProperties);

  for (const key of schemaKeys) {
    if (!markdownKeys.includes(key)) {
      throw new Error(
        `Nyckeln "${key}" saknas i 20_output_schema.md och schemat ar inte langre synkat.`,
      );
    }
  }
}

function nullableStringSchema() {
  return {
    anyOf: [{ type: "string" }, { type: "null" }],
  };
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" },
  };
}

function buildSchemaFromMarkdown(_markdown: string): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "context",
      "artefact",
      "productDimension",
      "processDimension",
      "agencyDimension",
      "complementaryEvidence",
      "inferenceCheck",
      "programmaticSuggestions",
      "pitfallsAvoided",
      "openQuestions",
    ],
    properties: {
      summary: { type: "string" },
      context: {
        type: "object",
        additionalProperties: false,
        required: [
          "subject",
          "level",
          "learningOutcomes",
          "courseContext",
          "constraints",
        ],
        properties: {
          subject: { type: "string" },
          level: {
            type: "string",
            enum: ["grund", "avancerad", "forskar"],
          },
          learningOutcomes: stringArraySchema(),
          courseContext: { type: "string" },
          constraints: stringArraySchema(),
        },
      },
      artefact: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "rationale"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
        },
      },
      productDimension: {
        type: "object",
        additionalProperties: false,
        required: [
          "included",
          "rationale",
          "criterion",
          "indicators",
          "evidence",
          "taxonomySupport",
        ],
        properties: {
          included: { type: "boolean" },
          rationale: { type: "string" },
          criterion: nullableStringSchema(),
          indicators: stringArraySchema(),
          evidence: stringArraySchema(),
          taxonomySupport: nullableStringSchema(),
        },
      },
      processDimension: {
        type: "object",
        additionalProperties: false,
        required: [
          "included",
          "rationale",
          "level",
          "criterion",
          "indicators",
          "evidence",
        ],
        properties: {
          included: { type: "boolean" },
          rationale: { type: "string" },
          level: {
            anyOf: [
              {
                type: "string",
                enum: ["operativ", "återkopplings", "disciplinär"],
              },
              { type: "null" },
            ],
          },
          criterion: nullableStringSchema(),
          indicators: stringArraySchema(),
          evidence: stringArraySchema(),
        },
      },
      agencyDimension: {
        type: "object",
        additionalProperties: false,
        required: [
          "included",
          "rationale",
          "level",
          "criterion",
          "indicators",
          "evidence",
          "interrogativeElement",
        ],
        properties: {
          included: { type: "boolean" },
          rationale: { type: "string" },
          level: {
            anyOf: [
              {
                type: "string",
                enum: ["individuell", "relationell", "epistemisk"],
              },
              { type: "null" },
            ],
          },
          criterion: nullableStringSchema(),
          indicators: stringArraySchema(),
          evidence: stringArraySchema(),
          interrogativeElement: nullableStringSchema(),
        },
      },
      complementaryEvidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "purpose", "specification"],
          properties: {
            type: { type: "string" },
            purpose: { type: "string" },
            specification: { type: "string" },
          },
        },
      },
      inferenceCheck: {
        type: "object",
        additionalProperties: false,
        required: ["passes", "reasoning", "revisions"],
        properties: {
          passes: { type: "boolean" },
          reasoning: { type: "string" },
          revisions: nullableStringSchema(),
        },
      },
      programmaticSuggestions: nullableStringSchema(),
      pitfallsAvoided: stringArraySchema(),
      openQuestions: {
        type: "array",
        items: nullableStringSchema(),
      },
    },
  };
}

export function getExamDesignJsonSchema(): Record<string, unknown> {
  if (cachedSchema) {
    return cachedSchema;
  }

  const markdown = readFileSync(resolveSchemaMarkdownPath(), "utf8");
  const schema = buildSchemaFromMarkdown(markdown);
  assertMarkdownMatchesSchema(markdown, schema);

  cachedSchema = schema;
  validator = ajv.compile<ExamDesignResult>(schema);

  return cachedSchema;
}

export function validateExamDesignResult(value: unknown): asserts value is ExamDesignResult {
  const schema = getExamDesignJsonSchema();
  if (!cachedSchema) {
    cachedSchema = schema;
  }

  if (!validator(value)) {
    throw new Error(
      `Modellens svar matchade inte output-schemat: ${ajv.errorsText(
        validator.errors,
        { separator: "; " },
      )}`,
    );
  }
}
