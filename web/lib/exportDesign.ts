"use client";

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

import type { ExamDesignInput, ExamDesignResult } from "@/lib/types";

function paragraph(text: string) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun(text)],
  });
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun(text)],
  });
}

function bullets(items: Array<string | null | undefined>) {
  const filtered = items.filter((item): item is string => Boolean(item));

  if (filtered.length === 0) {
    return [paragraph("Inget angivet.")];
  }

  return filtered.map(
    (item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
        spacing: { after: 80 },
      }),
  );
}

function dimensionBlock(
  title: string,
  dimension: {
    included: boolean;
    rationale: string;
    level?: string | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
  },
) {
  return [
    heading(title),
    paragraph(`Ingår: ${dimension.included ? "Ja" : "Nej"}`),
    dimension.level ? paragraph(`Nivå: ${dimension.level}`) : undefined,
    paragraph(`Motivering: ${dimension.rationale}`),
    dimension.criterion ? paragraph(`Kriterium: ${dimension.criterion}`) : undefined,
    paragraph("Indikatorer:"),
    ...bullets(dimension.indicators),
    paragraph("Evidens:"),
    ...bullets(dimension.evidence),
  ].filter((item): item is Paragraph => Boolean(item));
}

export async function exportDesignToDocx(params: {
  result: ExamDesignResult;
  input?: ExamDesignInput;
}) {
  const { result, input } = params;
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun("Examinationsförslag")],
          }),
          heading("Sammanfattning"),
          paragraph(result.summary),
          heading("Kontext"),
          paragraph(`Ämne: ${result.context.subject || input?.subject || ""}`),
          paragraph(`Nivå: ${result.context.level}`),
          paragraph(
            `Kurskontext: ${
              result.context.courseContext || input?.courseContext || "Inte angiven."
            }`,
          ),
          paragraph("Lärandemål:"),
          ...bullets(result.context.learningOutcomes),
          paragraph("Begränsningar:"),
          ...bullets(result.context.constraints),
          heading("Artefakt"),
          paragraph(result.artefact.name),
          paragraph(result.artefact.description),
          paragraph(`Motivering: ${result.artefact.rationale}`),
          ...dimensionBlock("Produkt", result.productDimension),
          ...dimensionBlock("Process", result.processDimension),
          ...dimensionBlock("Agens", result.agencyDimension),
          heading("Kompletterande underlag"),
          ...result.complementaryEvidence.flatMap((item) => [
            paragraph(`${item.type}: ${item.purpose}`),
            paragraph(item.specification),
          ]),
          heading("Inferens-kontroll"),
          paragraph(`Passerar: ${result.inferenceCheck.passes ? "Ja" : "Nej"}`),
          paragraph(result.inferenceCheck.reasoning),
          result.inferenceCheck.revisions
            ? paragraph(`Revideringar: ${result.inferenceCheck.revisions}`)
            : paragraph("Revideringar: Inga angivna."),
          heading("Programmatiska förslag"),
          paragraph(result.programmaticSuggestions ?? "Inga angivna."),
          heading("Fallgropar undvikna"),
          ...bullets(result.pitfallsAvoided),
          heading("Öppna frågor"),
          ...bullets(result.openQuestions),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "examinationsforslag.docx");
}
