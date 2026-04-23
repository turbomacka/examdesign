"use client";

import {
  collection,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import { useDeferredValue, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";

import { db } from "@/lib/firebase";
import type { StoredDesign } from "@/lib/types";

interface HistoryPageProps {
  userId: string;
  onOpenDesign: (design: StoredDesign) => void;
}

function formatDate(design: StoredDesign) {
  const date = design.createdAt?.toDate();
  if (!date) {
    return "Datum saknas";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toStoredDesign(id: string, data: DocumentData): StoredDesign {
  return {
    id,
    createdAt: data.createdAt,
    input: data.input,
    output: data.output,
    model: data.model,
    tokensUsed: data.tokensUsed,
  };
}

export function HistoryPage({ userId, onOpenDesign }: HistoryPageProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.toLowerCase().trim());
  const designsQuery = query(
    collection(db, "users", userId, "designs"),
    orderBy("createdAt", "desc"),
  );
  const [snapshot, loading, error] = useCollection(designsQuery);

  const designs =
    snapshot?.docs.map((doc) => toStoredDesign(doc.id, doc.data())) ?? [];
  const filteredDesigns = designs.filter((design) => {
    if (!deferredSearch) {
      return true;
    }

    const haystack = [
      design.input.subject,
      design.input.courseContext,
      design.input.learningOutcomes,
      design.output.summary,
      design.output.artefact.name,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredSearch);
  });

  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.9)] p-5 shadow-xl shadow-stone-900/5 backdrop-blur md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            Historik
          </p>
          <h2 className="mt-2 font-serif text-4xl">Tidigare förslag</h2>
        </div>
        <label className="grid gap-2 md:w-80">
          <span className="text-sm font-bold">Sök</span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ämne, lärandemål, artefakt..."
            value={search}
          />
        </label>
      </div>

      {loading ? (
        <p className="mt-8 text-[var(--muted)]">Laddar historik...</p>
      ) : null}
      {error ? (
        <p className="mt-8 rounded-3xl bg-red-50 p-4 text-[var(--danger)]">
          Kunde inte läsa historiken. Kontrollera inloggning och Firestore-regler.
        </p>
      ) : null}
      {!loading && filteredDesigns.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">
          Inga sparade förslag matchar sökningen.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {filteredDesigns.map((design) => (
          <button
            className="group rounded-[1.35rem] border border-[var(--line)] bg-white/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white"
            key={design.id}
            onClick={() => onOpenDesign(design)}
            type="button"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--accent)]">
                  {design.input.subject} · {design.input.level}
                </p>
                <h3 className="mt-1 font-serif text-2xl group-hover:text-[var(--accent-strong)]">
                  {design.output.artefact.name}
                </h3>
              </div>
              <p className="text-sm text-[var(--muted)]">{formatDate(design)}</p>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
              {design.output.summary}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
