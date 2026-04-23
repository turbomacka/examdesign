"use client";

import { httpsCallable } from "firebase/functions";
import { useEffect, useState, type FormEvent } from "react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { functions } from "@/lib/firebase";
import { courseContextExample, formTooltips } from "@/lib/uiMicrotexts";
import type {
  ExamDesignInput,
  GenerateExamDesignResponse,
} from "@/lib/types";

interface DesignFormProps {
  onGenerated: (result: {
    designId: string;
    result: GenerateExamDesignResponse["result"];
    input: ExamDesignInput;
  }) => void;
}

const initialInput: ExamDesignInput = {
  learningOutcomes: "",
  level: "grund",
  subject: "",
  courseContext: "",
  existingExamination: "",
  constraints: "",
};

function normalizeInput(input: ExamDesignInput): ExamDesignInput {
  return {
    learningOutcomes: input.learningOutcomes.trim(),
    level: input.level,
    subject: input.subject.trim(),
    courseContext: input.courseContext?.trim() || undefined,
    existingExamination: input.existingExamination?.trim() || undefined,
    constraints: input.constraints?.trim() || undefined,
  };
}

function readableFunctionError(error: unknown) {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  if (message.includes("OpenAI")) {
    return "OpenAI är inte konfigurerat ännu. Sätt OPENAI_API_KEY som Firebase secret.";
  }

  if (message.length > 0) {
    return message;
  }

  return "Kunde inte skapa förslaget just nu. Försök igen om en stund.";
}

function getProgressValue(elapsedSeconds: number) {
  if (elapsedSeconds < 6) {
    return 16 + elapsedSeconds * 5;
  }

  if (elapsedSeconds < 25) {
    return 46 + (elapsedSeconds - 6) * 1.4;
  }

  return Math.min(92, 72 + (elapsedSeconds - 25) * 0.45);
}

function getProgressLabel(elapsedSeconds: number) {
  if (elapsedSeconds < 6) {
    return "Förbereder underlag och kursdata...";
  }

  if (elapsedSeconds < 18) {
    return "Hämtar promptmaterial och konstruerar modellfrågan...";
  }

  if (elapsedSeconds < 45) {
    return "Modellen analyserar mål, nivå och evidenslogik...";
  }

  return "Validerar svaret och sparar förslaget i historiken...";
}

function TooltipText({ text }: { text: string | string[] }) {
  if (Array.isArray(text)) {
    return text.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
  }

  return <p>{text}</p>;
}

export function DesignForm({ onGenerated }: DesignFormProps) {
  const [input, setInput] = useState<ExamDesignInput>(initialInput);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressValue = getProgressValue(elapsedSeconds);

  useEffect(() => {
    if (!submitting) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [submitting]);

  function updateField<K extends keyof ExamDesignInput>(
    key: K,
    value: ExamDesignInput[K],
  ) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = normalizeInput(input);
    if (payload.learningOutcomes.length < 10 || payload.subject.length < 2) {
      setError("Fyll i kursmål och ämne innan du skickar.");
      return;
    }

    setElapsedSeconds(0);
    setSubmitting(true);
    try {
      const callable = httpsCallable<
        ExamDesignInput,
        GenerateExamDesignResponse
      >(functions, "generateExamDesign");
      const response = await callable(payload);
      onGenerated({
        designId: response.data.designId,
        result: response.data.result,
        input: payload,
      });
    } catch (submitError) {
      setError(readableFunctionError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.76fr_1.24fr]">
      <aside className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--paper)] shadow-xl shadow-stone-900/10">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-stone-300">
          Arbetsgång
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-tight">
          Från lärandemål till bedömningsbar evidens.
        </h2>
        <ol className="mt-8 grid gap-4 text-sm leading-6 text-stone-300">
          <li>1. Ange vad studenterna ska visa och på vilken nivå.</li>
          <li>2. Funktionen väljer huvudartefakt och bedömningsfokus.</li>
          <li>3. Svaret triangulerar där artefakten inte räcker.</li>
          <li>4. Inferens-kontrollen prövar om evidensen bär slutsatsen.</li>
        </ol>
      </aside>

      <form
        className="stagger grid gap-5 rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.9)] p-5 shadow-xl shadow-stone-900/5 backdrop-blur md:p-7"
        onSubmit={submit}
      >
        <label className="grid gap-2">
          <span className="flex items-center gap-2 font-bold">
            Kursmål
            <InfoTooltip ariaLabel="Förklaring till fältet Kursmål">
              <TooltipText text={formTooltips.learningOutcomes} />
            </InfoTooltip>
          </span>
          <textarea
            className="min-h-36 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={5000}
            minLength={10}
            onChange={(event) =>
              updateField("learningOutcomes", event.target.value)
            }
            placeholder="Klistra in ett eller flera lärandemål..."
            required
            value={input.learningOutcomes}
          />
        </label>

        <fieldset className="grid gap-3">
          <legend className="font-bold">
            <span className="flex items-center gap-2">
              Nivå
              <InfoTooltip ariaLabel="Förklaring till fältet Nivå">
                <TooltipText text={formTooltips.level} />
              </InfoTooltip>
            </span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["grund", "avancerad", "forskar"] as const).map((level) => (
              <label
                className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-3"
                key={level}
              >
                <input
                  checked={input.level === level}
                  name="level"
                  onChange={() => updateField("level", level)}
                  type="radio"
                />
                <span className="capitalize">{level}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 font-bold">
            Ämne
            <InfoTooltip ariaLabel="Förklaring till fältet Ämne">
              <TooltipText text={formTooltips.subject} />
            </InfoTooltip>
          </span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={5000}
            onChange={(event) => updateField("subject", event.target.value)}
            placeholder="t.ex. omvårdnad, maskinteknik..."
            required
            value={input.subject}
          />
        </label>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 font-bold">
            Kurskontext
            <InfoTooltip ariaLabel="Förklaring till fältet Kurskontext">
              <TooltipText text={formTooltips.courseContext} />
            </InfoTooltip>
          </span>
          <textarea
            className="min-h-24 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={1000}
            onChange={(event) =>
              updateField("courseContext", event.target.value)
            }
            placeholder="Valfritt. Kort beskrivning som hjälper verktyget ge bättre förslag."
            value={input.courseContext ?? ""}
          />
          <span className="text-xs leading-5 text-[var(--muted)]">
            <em>{courseContextExample}</em>
          </span>
        </label>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 font-bold">
            Befintlig examination
            <InfoTooltip ariaLabel="Förklaring till fältet Befintlig examination">
              <TooltipText text={formTooltips.existingExamination} />
            </InfoTooltip>
          </span>
          <textarea
            className="min-h-28 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={5000}
            onChange={(event) =>
              updateField("existingExamination", event.target.value)
            }
            placeholder="Valfritt. Beskriv nuvarande upplägg om det finns."
            value={input.existingExamination ?? ""}
          />
        </label>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 font-bold">
            Begränsningar
            <InfoTooltip ariaLabel="Förklaring till fältet Begränsningar">
              <TooltipText text={formTooltips.constraints} />
            </InfoTooltip>
          </span>
          <textarea
            className="min-h-24 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={5000}
            onChange={(event) => updateField("constraints", event.target.value)}
            placeholder="Valfritt. Tid, salstentakrav, gruppstorlek, AI-policy..."
            value={input.constraints ?? ""}
          />
        </label>

        {error ? (
          <p className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {submitting ? (
          <div
            aria-live="polite"
            className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4 shadow-inner shadow-stone-900/5"
            role="status"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--accent-strong)]">
                  {getProgressLabel(elapsedSeconds)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Det kan ta 30-90 sekunder att skapa ett genomarbetat förslag.
                  Första anropet efter en stunds inaktivitet kan ta extra tid.
                </p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                {elapsedSeconds}s
              </p>
            </div>
            <div
              aria-label="Framdrift"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(progressValue)}
              className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-warm)] to-[var(--accent)] transition-[width] duration-700"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Lämna sidan öppen. Resultatet visas automatiskt när det är klart.
            </p>
          </div>
        ) : null}

        <button
          className="rounded-full bg-[var(--accent)] px-6 py-4 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Skapar förslag..." : "Skapa examinationsförslag"}
        </button>
      </form>
    </section>
  );
}
