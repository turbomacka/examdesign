"use client";

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";

import { InfoTooltip } from "@/components/InfoTooltip";
import { auth, db, functions } from "@/lib/firebase";
import type {
  ConsentState,
  DimensionFeedback,
  ExamDesignInput,
  ExamDesignResult,
  FeedbackInput,
  PitfallId,
  SubmitFeedbackResponse,
  WouldUseAs,
} from "@/lib/types";

type TriState = "ja" | "nej" | "vet_ej";

interface FeedbackFormProps {
  designId: string;
  input?: ExamDesignInput;
  result: ExamDesignResult;
  onSubmitted?: () => void;
}

interface DimensionDraft {
  levelReasonable: TriState;
  inferenceBears: TriState;
  comment: string;
}

const defaultDimensionDraft: DimensionDraft = {
  levelReasonable: "vet_ej",
  inferenceBears: "vet_ej",
  comment: "",
};

const inferenceQuestionHelp =
  "Exempel: Om förslaget säger att studentens agens ska bedömas — finns det faktiskt något i de föreslagna underlagen som visar studentens val och motiveringar? Eller bedömer underlagen egentligen något annat?";

const pitfallOptions: Array<{ id: PitfallId; help: string; label: string }> = [
  {
    id: "pseudo_agens",
    label: "Pseudo-agens",
    help: 'Uppgiften ber studenten reflektera men kräver inga verkliga val. "Reflektera över ditt lärande" bedömer inte agens om det inte finns genuina alternativ att välja mellan eller prioriteringar att motivera.',
  },
  {
    id: "dokumentationsfetisch",
    label: "Dokumentationsfetisch",
    help: "Uppgiften mäter mängd istället för kvalitet. Antal utkast eller mängd kommentarer säger inget om hur väl studenten faktiskt utvecklat sitt arbete.",
  },
  {
    id: "vardering",
    label: "Värderingsglidning",
    help: 'Kriterierna bedömer personliga egenskaper istället för kunnande. "Visar engagemang" eller "är ansvarstagande" beskriver karaktär, inte prestationer.',
  },
  {
    id: "taxonomi_dominans",
    label: "Taxonomi-dominans",
    help: "Bloom och SOLO används där de inte hör hemma. Taxonomierna är bra för produktdimensionen men fångar inte processens kvalitetspraktiker eller agensens handlingsutrymme.",
  },
  {
    id: "pseudo_autenticitet",
    label: "Pseudo-autenticitet",
    help: 'Uppgiften är "verklig" men bedömningen är inte. En fallstudie eller autentisk uppdragsform förlorar sin pedagogiska poäng om bara den färdiga produkten bedöms, utan krav på val och omarbetning under osäkerhet.',
  },
  {
    id: "triptyk_tvang",
    label: "Triptyk-tvång",
    help: "Alla tre dimensioner pressas in i samma uppgift. Ramverket fungerar ofta bäst när olika examinationer i en kurs bär olika dimensioner — inte när varje uppgift ska bära allt.",
  },
  {
    id: "annan",
    label: "Annan",
    help: "Något annat problem som inte fångas av kategorierna ovan. Beskriv i fritextfältet nedan.",
  },
];

const wouldUseOptions: Array<{ id: WouldUseAs; label: string }> = [
  { id: "som_ar", label: "som det är" },
  { id: "mindre_just", label: "med mindre justeringar" },
  { id: "stora_just", label: "med stora justeringar" },
  { id: "nej", label: "nej" },
];

function triStateToBoolean(value: TriState): boolean | null {
  if (value === "ja") {
    return true;
  }

  if (value === "nej") {
    return false;
  }

  return null;
}

function toDimensionFeedback(
  included: boolean,
  draft: DimensionDraft,
  includeLevelQuestion: boolean,
): DimensionFeedback | null {
  if (!included) {
    return null;
  }

  return {
    levelReasonable: includeLevelQuestion
      ? triStateToBoolean(draft.levelReasonable)
      : null,
    inferenceBears: triStateToBoolean(draft.inferenceBears),
    comment: draft.comment.trim(),
  };
}

function ToggleGroup({
  label,
  onChange,
  value,
}: {
  label: ReactNode;
  onChange: (value: TriState) => void;
  value: TriState;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {[
          ["ja", "Ja"],
          ["nej", "Nej"],
          ["vet_ej", "Vet ej"],
        ].map(([id, text]) => (
          <label
            className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-2 text-sm"
            key={id}
          >
            <input
              checked={value === id}
              className="mr-2"
              onChange={() => onChange(id as TriState)}
              type="radio"
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DimensionFeedbackSection({
  draft,
  includeLevelQuestion,
  onChange,
  title,
}: {
  draft: DimensionDraft;
  includeLevelQuestion: boolean;
  onChange: (draft: DimensionDraft) => void;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/70 p-4">
      <h4 className="font-serif text-2xl">{title}</h4>
      {includeLevelQuestion ? (
        <ToggleGroup
          label="Är föreslagen nivå rimlig?"
          onChange={(levelReasonable) =>
            onChange({ ...draft, levelReasonable })
          }
          value={draft.levelReasonable}
        />
      ) : null}
      <ToggleGroup
        label={
          <span className="inline-flex items-center gap-2">
            Räcker underlagen för att göra den bedömning som föreslås?
            <InfoTooltip ariaLabel="Förklaring till frågan om underlagen räcker">
              <p>{inferenceQuestionHelp}</p>
            </InfoTooltip>
          </span>
        }
        onChange={(inferenceBears) => onChange({ ...draft, inferenceBears })}
        value={draft.inferenceBears}
      />
      <label className="grid gap-2">
        <span className="text-sm font-bold">Kommentar</span>
        <textarea
          className="min-h-24 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
          maxLength={1000}
          onChange={(event) =>
            onChange({ ...draft, comment: event.target.value })
          }
          value={draft.comment}
        />
      </label>
    </section>
  );
}

export function FeedbackForm({
  designId,
  result,
  onSubmitted,
}: FeedbackFormProps) {
  const [user] = useAuthState(auth);
  const [usefulness, setUsefulness] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [freetext, setFreetext] = useState("");
  const [product, setProduct] = useState<DimensionDraft>(defaultDimensionDraft);
  const [process, setProcess] = useState<DimensionDraft>(defaultDimensionDraft);
  const [agency, setAgency] = useState<DimensionDraft>(defaultDimensionDraft);
  const [pitfalls, setPitfalls] = useState<PitfallId[]>([]);
  const [pitfallsOther, setPitfallsOther] = useState("");
  const [editsBeforeUse, setEditsBeforeUse] = useState("");
  const [wouldUseAs, setWouldUseAs] = useState<WouldUseAs>("mindre_just");
  const [contactAlreadyAccepted, setContactAlreadyAccepted] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    async function loadConsent() {
      const snapshot = await getDoc(doc(db, "users", uid, "consent", "current"));
      if (!cancelled && snapshot.exists()) {
        const consent = snapshot.data() as Partial<ConsentState>;
        setContactAlreadyAccepted(consent.contactAccepted === true);
      }
    }

    void loadConsent();

    return () => {
      cancelled = true;
    };
  }, [user]);

  function togglePitfall(id: PitfallId, checked: boolean) {
    setPitfalls((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (usefulness === 0) {
      setStatus("Välj ett betyg mellan 1 och 5.");
      return;
    }

    const payload: FeedbackInput = {
      designId,
      overall: {
        usefulness,
        freetext: freetext.trim(),
      },
      dimensions: {
        product: toDimensionFeedback(
          result.productDimension.included,
          product,
          false,
        ),
        process: toDimensionFeedback(
          result.processDimension.included,
          process,
          true,
        ),
        agency: toDimensionFeedback(
          result.agencyDimension.included,
          agency,
          true,
        ),
      },
      pitfallsIdentified: pitfalls,
      pitfallsOther: pitfallsOther.trim(),
      editsBeforeUse: editsBeforeUse.trim(),
      wouldUseAs,
      contactConsent: contactAlreadyAccepted || contactConsent,
    };

    setSubmitting(true);
    try {
      const callable = httpsCallable<FeedbackInput, SubmitFeedbackResponse>(
        functions,
        "submitFeedback",
      );
      await callable(payload);
      setSubmitted(true);
      setStatus("Tack, återkopplingen har sparats.");
      onSubmitted?.();
    } catch {
      setStatus("Kunde inte skicka återkopplingen just nu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4 text-sm text-[var(--muted)]">
        Tack, återkopplingen har sparats.
      </p>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-[1.35rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.96)] p-5 shadow-xl shadow-stone-900/10"
      onSubmit={submit}
    >
      <section className="grid gap-3">
        <h3 className="font-serif text-3xl">Ge återkoppling</h3>
        <fieldset className="grid gap-2">
          <legend className="font-bold">
            Är detta designförslag användbart i din kurs?
          </legend>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4, 5] as const).map((rating) => (
              <button
                aria-pressed={usefulness === rating}
                className={`size-11 rounded-full border text-lg font-bold transition ${
                  usefulness === rating
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white/80 text-[var(--muted)]"
                }`}
                key={rating}
                onClick={() => setUsefulness(rating)}
                type="button"
              >
                {rating}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-2">
          <span className="font-bold">Kommentar (valfritt)</span>
          <textarea
            className="min-h-28 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={2000}
            onChange={(event) => setFreetext(event.target.value)}
            value={freetext}
          />
        </label>
      </section>

      {result.productDimension.included ? (
        <DimensionFeedbackSection
          draft={product}
          includeLevelQuestion={false}
          onChange={setProduct}
          title="Produkt"
        />
      ) : null}
      {result.processDimension.included ? (
        <DimensionFeedbackSection
          draft={process}
          includeLevelQuestion
          onChange={setProcess}
          title="Process"
        />
      ) : null}
      {result.agencyDimension.included ? (
        <DimensionFeedbackSection
          draft={agency}
          includeLevelQuestion
          onChange={setAgency}
          title="Agens"
        />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="font-bold">Identifierade fallgropar</legend>
        <div className="grid gap-2">
          {pitfallOptions.map((option) => (
            <label
              className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white/70 p-3 text-sm"
              key={option.id}
            >
              <input
                checked={pitfalls.includes(option.id)}
                className="mt-1"
                onChange={(event) =>
                  togglePitfall(option.id, event.target.checked)
                }
                type="checkbox"
              />
              <span className="grid gap-1">
                <span className="font-semibold text-[var(--ink)]">
                  {option.label}
                </span>
                <span className="text-sm leading-6 text-[var(--muted)]">
                  {option.help}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {pitfalls.includes("annan") ? (
        <label className="grid gap-2">
          <span className="font-bold">Annan fallgrop</span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            maxLength={500}
            onChange={(event) => setPitfallsOther(event.target.value)}
            value={pitfallsOther}
          />
        </label>
      ) : null}

      <label className="grid gap-2">
        <span className="font-bold">
          Vad skulle du ändra innan du gav uppgiften till studenter?
        </span>
        <textarea
          className="min-h-28 rounded-3xl border border-[var(--line)] bg-white/80 p-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
          maxLength={2000}
          onChange={(event) => setEditsBeforeUse(event.target.value)}
          value={editsBeforeUse}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="font-bold">Skulle du använda förslaget?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {wouldUseOptions.map((option) => (
            <label
              className="rounded-full border border-[var(--line)] bg-white/75 px-4 py-3"
              key={option.id}
            >
              <input
                checked={wouldUseAs === option.id}
                className="mr-2"
                onChange={() => setWouldUseAs(option.id)}
                type="radio"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {!contactAlreadyAccepted ? (
        <label className="flex gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
          <input
            checked={contactConsent}
            className="mt-1"
            onChange={(event) => setContactConsent(event.target.checked)}
            type="checkbox"
          />
          <span>Får vi kontakta dig för uppföljningsintervju?</span>
        </label>
      ) : null}

      {status ? (
        <p className="rounded-3xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          {status}
        </p>
      ) : null}

      <button
        className="rounded-full bg-[var(--accent)] px-6 py-4 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Skickar..." : "Skicka återkoppling"}
      </button>
    </form>
  );
}
