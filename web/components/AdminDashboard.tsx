"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";

import { AdminInviteCodes } from "@/components/AdminInviteCodes";
import { auth, functions } from "@/lib/firebase";
import type {
  AdminExportResponse,
  AdminFeedbackRecord,
  AdminStatsResponse,
  IsAdminResponse,
  PitfallId,
  WouldUseAs,
} from "@/lib/types";

interface AdminFilters {
  fromDate: string;
  toDate: string;
  minUsefulness: string;
  pitfall: "" | PitfallId;
  wouldUseAs: "" | WouldUseAs;
}

const initialFilters: AdminFilters = {
  fromDate: "",
  toDate: "",
  minUsefulness: "",
  pitfall: "",
  wouldUseAs: "",
};

const pitfallLabels: Record<PitfallId, string> = {
  pseudo_agens: "Pseudo-agens",
  dokumentationsfetisch: "Dokumentationsfetisch",
  vardering: "Värderingsglidning",
  taxonomi_dominans: "Taxonomi-dominans",
  pseudo_autenticitet: "Pseudo-autenticitet",
  triptyk_tvang: "Triptyk-tvång",
  annan: "Annan",
};

const wouldUseLabels: Record<WouldUseAs, string> = {
  som_ar: "Som det är",
  mindre_just: "Mindre justeringar",
  stora_just: "Stora justeringar",
  nej: "Nej",
};

function compactFilters(filters: AdminFilters) {
  return {
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
    ...(filters.minUsefulness
      ? { minUsefulness: Number(filters.minUsefulness) }
      : {}),
    ...(filters.pitfall ? { pitfall: filters.pitfall } : {}),
    ...(filters.wouldUseAs ? { wouldUseAs: filters.wouldUseAs } : {}),
  };
}

function formatTimestamp(value: string | undefined) {
  if (!value) {
    return "Datum saknas";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function rowMatchesFilters(row: AdminFeedbackRecord, filters: AdminFilters) {
  const feedback = row.feedback;
  if (!feedback) {
    return false;
  }

  if (
    filters.minUsefulness &&
    feedback.overall.usefulness < Number(filters.minUsefulness)
  ) {
    return false;
  }

  if (filters.pitfall && !feedback.pitfallsIdentified.includes(filters.pitfall)) {
    return false;
  }

  if (filters.wouldUseAs && feedback.wouldUseAs !== filters.wouldUseAs) {
    return false;
  }

  if (filters.fromDate && row.timestamp) {
    if (new Date(row.timestamp) < new Date(filters.fromDate)) {
      return false;
    }
  }

  if (filters.toDate && row.timestamp) {
    if (new Date(row.timestamp) > new Date(filters.toDate)) {
      return false;
    }
  }

  return true;
}

function downloadContent(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboard() {
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [filters, setFilters] = useState<AdminFilters>(initialFilters);
  const [selected, setSelected] = useState<AdminFeedbackRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function loadAdminData() {
      setLoading(true);
      try {
        const adminCallable = httpsCallable<Record<string, never>, IsAdminResponse>(
          functions,
          "isAdmin",
        );
        const adminResult = await adminCallable({});

        if (!adminResult.data.isAdmin) {
          router.replace("/ny");
          return;
        }

        const statsCallable = httpsCallable<
          Record<string, never>,
          AdminStatsResponse
        >(functions, "getAdminStats");
        const statsResult = await statsCallable({});

        if (!cancelled) {
          setStats(statsResult.data);
        }
      } catch {
        if (!cancelled) {
          setStatus("Kunde inte läsa admin-data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, user]);

  async function exportData(format: "json" | "csv") {
    setStatus(null);
    try {
      const callable = httpsCallable<
        { format: "json" | "csv"; filters: ReturnType<typeof compactFilters> },
        AdminExportResponse
      >(functions, "exportFeedback");
      const response = await callable({
        format,
        filters: compactFilters(filters),
      });
      downloadContent(
        response.data.content,
        `examdesign-feedback.${format}`,
        format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      );
    } catch {
      setStatus("Kunde inte exportera återkoppling.");
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-sm text-[var(--muted)] shadow-sm">
          Laddar adminvy...
        </p>
      </main>
    );
  }

  const rows = stats?.feedbackRecords.filter((row) =>
    rowMatchesFilters(row, filters),
  ) ?? [];

  return (
    <main className="page-enter flex-1 px-4 py-8 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.9)] p-6 shadow-xl shadow-stone-900/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            Admin
          </p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">
            Forskningskalibrering
          </h1>
        </header>

        {status ? (
          <p className="rounded-3xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
            {status}
          </p>
        ) : null}

        {stats ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Totalt antal designs", stats.totalDesigns],
                ["Feedback-poster", stats.totalFeedback],
                ["Aktivitet 7 dagar", stats.last7DaysActivity],
                ["Snittbetyg", stats.averageUsefulness ?? "Saknas"],
              ].map(([label, value]) => (
                <div
                  className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-5"
                  key={label}
                >
                  <p className="text-sm text-[var(--muted)]">{label}</p>
                  <p className="mt-2 font-serif text-4xl">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-5">
                <h2 className="font-serif text-3xl">Betygsfördelning</h2>
                <div className="mt-4 grid gap-2">
                  {Object.entries(stats.usefulnessDistribution).map(
                    ([rating, count]) => (
                      <p className="flex justify-between" key={rating}>
                        <span>{rating}</span>
                        <strong>{count}</strong>
                      </p>
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-5">
                <h2 className="font-serif text-3xl">Fallgropar</h2>
                <div className="mt-4 grid gap-2">
                  {Object.entries(stats.pitfallDistribution).map(
                    ([pitfall, count]) => (
                      <p className="flex justify-between" key={pitfall}>
                        <span>{pitfallLabels[pitfall as PitfallId] ?? pitfall}</span>
                        <strong>{count}</strong>
                      </p>
                    ),
                  )}
                </div>
              </div>
            </section>

            <AdminInviteCodes initialCodes={stats.inviteCodes} />

            <section className="grid gap-4 rounded-[1.35rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.9)] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <h2 className="font-serif text-3xl">Feedback-lista</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-[var(--paper)]"
                    onClick={() => void exportData("json")}
                    type="button"
                  >
                    Exportera JSON
                  </button>
                  <button
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"
                    onClick={() => void exportData("csv")}
                    type="button"
                  >
                    Exportera CSV
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <label className="grid gap-1">
                  <span className="text-xs font-bold">Från datum</span>
                  <input
                    className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-2"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        fromDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={filters.fromDate}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold">Till datum</span>
                  <input
                    className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-2"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        toDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={filters.toDate}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold">Min betyg</span>
                  <select
                    className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-2"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        minUsefulness: event.target.value,
                      }))
                    }
                    value={filters.minUsefulness}
                  >
                    <option value="">Alla</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold">Fallgrop</span>
                  <select
                    className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-2"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        pitfall: event.target.value as "" | PitfallId,
                      }))
                    }
                    value={filters.pitfall}
                  >
                    <option value="">Alla</option>
                    {Object.entries(pitfallLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold">Användning</span>
                  <select
                    className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-2"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        wouldUseAs: event.target.value as "" | WouldUseAs,
                      }))
                    }
                    value={filters.wouldUseAs}
                  >
                    <option value="">Alla</option>
                    {Object.entries(wouldUseLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)]">
                      <th className="px-3 py-2">Tid</th>
                      <th className="px-3 py-2">Design</th>
                      <th className="px-3 py-2">Betyg</th>
                      <th className="px-3 py-2">Användning</th>
                      <th className="px-3 py-2">Fallgropar</th>
                      <th className="px-3 py-2">Utdrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        className="cursor-pointer bg-white/75 transition hover:bg-white"
                        key={row.id}
                        onClick={() => setSelected(row)}
                      >
                        <td className="rounded-l-2xl px-3 py-3">
                          {formatTimestamp(row.timestamp)}
                        </td>
                        <td className="px-3 py-3">{row.designId}</td>
                        <td className="px-3 py-3">
                          {row.feedback?.overall.usefulness ?? "-"}
                        </td>
                        <td className="px-3 py-3">
                          {row.feedback?.wouldUseAs
                            ? wouldUseLabels[row.feedback.wouldUseAs]
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          {row.feedback?.pitfallsIdentified
                            .map((pitfall) => pitfallLabels[pitfall])
                            .join(", ") || "-"}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3">
                          {row.feedback?.editsBeforeUse.slice(0, 90) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 p-4">
          <div className="mx-auto grid max-w-5xl gap-4 rounded-[1.5rem] bg-[var(--paper)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-3xl">Feedbackdetalj</h2>
              <button
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-[var(--paper)]"
                onClick={() => setSelected(null)}
                type="button"
              >
                Stäng
              </button>
            </div>
            <pre className="max-h-[70vh] overflow-auto rounded-2xl bg-stone-950 p-4 text-xs leading-5 text-stone-100">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </main>
  );
}
