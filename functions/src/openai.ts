import OpenAI from "openai";

import { type ExamDesignResult, validateExamDesignResult } from "./schema";

const DEFAULT_MODEL = "gpt-5.4";

const clients = new Map<string, OpenAI>();

interface GenerateStructuredExamDesignParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
}

function getClient(apiKey: string): OpenAI {
  const cached = clients.get(apiKey);
  if (cached) {
    return cached;
  }

  const client = new OpenAI({ apiKey });
  clients.set(apiKey, client);
  return client;
}

export function resolveConfiguredModel(secretValue?: string): string {
  return secretValue && secretValue.trim().length > 0
    ? secretValue.trim()
    : DEFAULT_MODEL;
}

export async function generateStructuredExamDesign(
  params: GenerateStructuredExamDesignParams,
): Promise<{
  output: ExamDesignResult;
  model: string;
  responseId: string;
  tokensUsed: { input: number; output: number };
}> {
  const client = getClient(params.apiKey);
  const response = await client.responses.create({
    model: params.model,
    store: false,
    instructions: params.systemPrompt,
    input: params.userPrompt,
    max_output_tokens: 4000,
    temperature: 0.3,
    text: {
      format: {
        type: "json_schema",
        name: "exam_design",
        strict: true,
        schema: params.schema,
        description:
          "Strukturerat examinationsforslag enligt produkt-process-agens.",
      },
    },
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error("Responses API returnerade inget textinnehall.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new Error(
      `Modellsvaret gick inte att tolka som JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  validateExamDesignResult(parsed);

  return {
    output: parsed,
    model: response.model,
    responseId: response.id,
    tokensUsed: {
      input: response.usage?.input_tokens ?? 0,
      output: response.usage?.output_tokens ?? 0,
    },
  };
}
