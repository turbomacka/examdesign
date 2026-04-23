"use client";

import { httpsCallable } from "firebase/functions";
import { useEffect, useState, type FormEvent } from "react";

import { functions } from "@/lib/firebase";
import type {
  AdminInviteCode,
  CreateInviteCodeInput,
  CreateInviteCodeResponse,
} from "@/lib/types";

interface AdminInviteCodesProps {
  initialCodes: AdminInviteCode[];
}

interface InviteCodeFormState {
  label: string;
  maxUses: string;
  expiresAt: string;
}

const initialForm: InviteCodeFormState = {
  label: "",
  maxUses: "1",
  expiresAt: "",
};

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatus(code: AdminInviteCode) {
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) {
    return "Utgången";
  }

  if (code.useCount >= code.maxUses) {
    return "Förbrukad";
  }

  return "Aktiv";
}

export function AdminInviteCodes({ initialCodes }: AdminInviteCodesProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [form, setForm] = useState<InviteCodeFormState>(initialForm);
  const [createdCode, setCreatedCode] = useState<AdminInviteCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setCodes(initialCodes);
  }, [initialCodes]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Koden kopierades.");
    } catch {
      setStatus("Kunde inte kopiera automatiskt. Markera koden manuellt.");
    }
  }

  async function createCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const maxUses = Number(form.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) {
      setStatus("Max antal inlösningar måste vara mellan 1 och 500.");
      return;
    }

    setCreating(true);
    try {
      const callable = httpsCallable<
        CreateInviteCodeInput,
        CreateInviteCodeResponse
      >(functions, "createInviteCode");
      const result = await callable({
        ...(form.label.trim() ? { label: form.label.trim() } : {}),
        maxUses,
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      });

      const inviteCode = result.data.inviteCode;
      setCreatedCode(inviteCode);
      setCodes((current) => [
        inviteCode,
        ...current.filter((code) => code.id !== inviteCode.id),
      ]);
      setForm(initialForm);
      setStatus("Promokoden skapades.");
    } catch {
      setStatus("Kunde inte skapa promokod.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-[1.35rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.9)] p-5">
      <div className="grid gap-2">
        <h2 className="font-serif text-3xl">Promokoder</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Skapa koder som testanvändare kan lösa in på åtkomstsidan. När en kod
          löses in läggs användarens e-postadress till i allowlist.
        </p>
      </div>

      <form className="grid gap-3 lg:grid-cols-[1fr_10rem_13rem_auto]" onSubmit={createCode}>
        <label className="grid gap-1">
          <span className="text-xs font-bold">Etikett eller anteckning</span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3"
            maxLength={120}
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
            placeholder="T.ex. pilotgrupp april"
            type="text"
            value={form.label}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold">Max inlösningar</span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3"
            max={500}
            min={1}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                maxUses: event.target.value,
              }))
            }
            type="number"
            value={form.maxUses}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold">Utgångsdatum</span>
          <input
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-3"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                expiresAt: event.target.value,
              }))
            }
            type="date"
            value={form.expiresAt}
          />
        </label>

        <button
          className="self-end rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-bold text-[var(--paper)] transition hover:bg-black disabled:opacity-60"
          disabled={creating}
          type="submit"
        >
          {creating ? "Skapar..." : "Skapa promokod"}
        </button>
      </form>

      {status ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white/70 p-3 text-sm text-[var(--muted)]">
          {status}
        </p>
      ) : null}

      {createdCode ? (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-[var(--accent)] bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Ny promokod
            </p>
            <code className="mt-2 block text-2xl font-bold tracking-[0.18em] text-[var(--ink)]">
              {createdCode.code}
            </code>
          </div>
          <button
            className="w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"
            onClick={() => void copyCode(createdCode.code)}
            type="button"
          >
            Kopiera kod
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="px-3 py-2">Kod</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Användning</th>
              <th className="px-3 py-2">Utgår</th>
              <th className="px-3 py-2">Anteckning</th>
              <th className="px-3 py-2">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td
                  className="rounded-2xl bg-white/75 px-3 py-4 text-[var(--muted)]"
                  colSpan={6}
                >
                  Inga promokoder har skapats ännu.
                </td>
              </tr>
            ) : null}
            {codes.map((code) => (
              <tr className="bg-white/75" key={code.id}>
                <td className="rounded-l-2xl px-3 py-3 font-mono font-bold">
                  {code.code}
                </td>
                <td className="px-3 py-3">{getStatus(code)}</td>
                <td className="px-3 py-3">
                  {code.useCount}/{code.maxUses}
                </td>
                <td className="px-3 py-3">{formatDateTime(code.expiresAt)}</td>
                <td className="px-3 py-3">{code.label || "-"}</td>
                <td className="rounded-r-2xl px-3 py-3">
                  <button
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold transition hover:border-[var(--accent)]"
                    onClick={() => void copyCode(code.code)}
                    type="button"
                  >
                    Kopiera
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
