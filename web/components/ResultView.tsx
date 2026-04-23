"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { FeedbackForm } from "@/components/FeedbackForm";
import { InfoTooltip } from "@/components/InfoTooltip";
import { exportDesignToDocx } from "@/lib/exportDesign";
import { resultTooltips } from "@/lib/uiMicrotexts";
import type { ExamDesignInput, ExamDesignResult } from "@/lib/types";

interface ResultViewProps {
  designId: string;
  result: ExamDesignResult;
  input?: ExamDesignInput;
  model?: string;
}

function Section({
  children,
  title,
  tooltip,
  tooltipLabel,
}: {
  children: ReactNode;
  title: string;
  tooltip?: string;
  tooltipLabel?: string;
}) {
  return (
    <section className="rounded-[1.35rem] border border-[var(--line)] bg-white/70 p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-3xl">{title}</h3>
        {tooltip ? (
          <InfoTooltip
            ariaLabel={tooltipLabel ?? `Förklaring till sektionen ${title}`}
          >
            <p>{tooltip}</p>
          </InfoTooltip>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-7 text-[var(--ink)]">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: Array<string | null | undefined> }) {
  const filtered = items.filter((item): item is string => Boolean(item));

  if (filtered.length === 0) {
    return <p className="text-[var(--muted)]">Inget angivet.</p>;
  }

  return (
    <ul className="grid gap-2">
      {filtered.map((item, index) => (
        <li className="rounded-2xl bg-[var(--paper)] px-4 py-3" key={index}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Dimension({
  title,
  dimension,
}: {
  title: string;
  dimension: {
    included: boolean;
    rationale: string;
    level?: string | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
    taxonomySupport?: string | null;
    interrogativeElement?: string | null;
  };
}) {
  return (
    <Section title={title}>
      <p>
        <strong>Ingår:</strong> {dimension.included ? "Ja" : "Nej"}
      </p>
      {dimension.level ? (
        <p>
          <strong>Nivå:</strong> {dimension.level}
        </p>
      ) : null}
      <p>
        <strong>Motivering:</strong> {dimension.rationale}
      </p>
      <p>
        <strong>Kriterium:</strong> {dimension.criterion ?? "Inte angivet."}
      </p>
      {dimension.taxonomySupport !== undefined ? (
        <p>
          <strong>Taxonomistöd:</strong>{" "}
          {dimension.taxonomySupport ?? "Inte angivet."}
        </p>
      ) : null}
      {dimension.interrogativeElement !== undefined ? (
        <p>
          <strong>Interrogativt moment:</strong>{" "}
          {dimension.interrogativeElement ?? "Inte angivet."}
        </p>
      ) : null}
      <div>
        <strong>Indikatorer</strong>
        <List items={dimension.indicators} />
      </div>
      <div>
        <strong>Evidens</strong>
        <List items={dimension.evidence} />
      </div>
    </Section>
  );
}

export function ResultView({
  designId,
  input,
  model,
  result,
}: ResultViewProps) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showFeedbackReminder, setShowFeedbackReminder] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowFeedbackReminder(true);
    }, 180000);

    return () => window.clearTimeout(timeout);
  }, []);

  async function exportDocx() {
    setStatus(null);
    setExporting(true);
    try {
      await exportDesignToDocx({ result, input });
      setStatus("Word-filen har skapats.");
    } catch {
      setStatus("Kunde inte skapa Word-filen.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <article className="grid gap-5 rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.92)] p-5 shadow-xl shadow-stone-900/5 backdrop-blur md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            Resultat
          </p>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl">
            Examinationsförslag
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            ID: {designId}
            {model ? ` · Modell: ${model}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--muted)]"
            disabled
            type="button"
          >
            Sparat i historik
          </button>
          <button
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--accent-strong)] transition hover:border-[var(--accent)]"
            onClick={() => {
              setFeedbackOpen((current) => !current);
              setShowFeedbackReminder(false);
            }}
            type="button"
          >
            Ge återkoppling
          </button>
          <button
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            disabled={exporting}
            onClick={exportDocx}
            type="button"
          >
            {exporting ? "Exporterar..." : "Exportera till Word"}
          </button>
        </div>
      </div>

      {status ? (
        <p className="rounded-3xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          {status}
        </p>
      ) : null}

      <Section title="Sammanfattning">
        <p>{result.summary}</p>
      </Section>

      <Section title="Kontext">
        <p>
          <strong>Ämne:</strong> {result.context.subject}
        </p>
        <p>
          <strong>Nivå:</strong> {result.context.level}
        </p>
        <p>
          <strong>Kurskontext:</strong>{" "}
          {result.context.courseContext || input?.courseContext || "Inte angiven."}
        </p>
        <div>
          <strong>Lärandemål</strong>
          <List items={result.context.learningOutcomes} />
        </div>
        <div>
          <strong>Begränsningar</strong>
          <List items={result.context.constraints} />
        </div>
      </Section>

      <Section title="Artefakt">
        <p>
          <strong>{result.artefact.name}</strong>
        </p>
        <p>{result.artefact.description}</p>
        <p>
          <strong>Motivering:</strong> {result.artefact.rationale}
        </p>
      </Section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Dimension title="Produkt" dimension={result.productDimension} />
        <Dimension title="Process" dimension={result.processDimension} />
        <Dimension title="Agens" dimension={result.agencyDimension} />
      </div>

      <Section title="Kompletterande underlag">
        <p className="text-[var(--muted)]">
          Extra material studenten producerar utöver huvudartefakten —
          beslutslogg, muntligt försvar, revisionsspår eller liknande — för att
          synliggöra det som artefakten ensam inte kan bära.
        </p>
        {result.complementaryEvidence.length === 0 ? (
          <p className="text-[var(--muted)]">Inga kompletterande underlag.</p>
        ) : (
          result.complementaryEvidence.map((item, index) => (
            <div className="rounded-2xl bg-[var(--paper)] p-4" key={index}>
              <p className="font-bold">{item.type}</p>
              <p>{item.purpose}</p>
              <p className="text-[var(--muted)]">{item.specification}</p>
            </div>
          ))
        )}
      </Section>

      <Section
        title="Inferens-kontroll"
        tooltip={resultTooltips.inferenceCheck}
      >
        <p>
          <strong>Passerar:</strong>{" "}
          {result.inferenceCheck.passes ? "Ja" : "Nej"}
        </p>
        <p>{result.inferenceCheck.reasoning}</p>
        <p>
          <strong>Revideringar:</strong>{" "}
          {result.inferenceCheck.revisions ?? "Inga angivna."}
        </p>
      </Section>

      <Section
        title="Programmatiska förslag"
        tooltip={resultTooltips.programmaticSuggestions}
      >
        <p>{result.programmaticSuggestions ?? "Inga angivna."}</p>
      </Section>

      <Section title="Fallgropar undvikna" tooltip={resultTooltips.pitfallsAvoided}>
        <List items={result.pitfallsAvoided} />
      </Section>

      <Section title="Öppna frågor" tooltip={resultTooltips.openQuestions}>
        <List items={result.openQuestions} />
      </Section>

      {showFeedbackReminder && !feedbackOpen ? (
        <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/80 p-4 text-sm leading-6 text-[var(--muted)] shadow-sm">
          Vill du hjälpa till att förbättra verktyget?{" "}
          <button
            className="font-bold text-[var(--accent-strong)] underline-offset-4 hover:underline"
            onClick={() => {
              setFeedbackOpen(true);
              setShowFeedbackReminder(false);
            }}
            type="button"
          >
            Ge kort återkoppling.
          </button>
        </div>
      ) : null}

      {feedbackOpen ? (
        <FeedbackForm
          designId={designId}
          input={input}
          onSubmitted={() => setShowFeedbackReminder(false)}
          result={result}
        />
      ) : null}

      <button
        aria-expanded={feedbackOpen}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-bold text-[var(--paper)] shadow-2xl shadow-stone-900/20 transition hover:-translate-y-0.5 hover:bg-black"
        onClick={() => {
          setFeedbackOpen((current) => !current);
          setShowFeedbackReminder(false);
        }}
        type="button"
      >
        Ge återkoppling
      </button>
    </article>
  );
}
