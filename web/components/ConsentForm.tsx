"use client";

import { signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db, functions } from "@/lib/firebase";
import { consentCopy, consentPageLink } from "@/lib/uiMicrotexts";
import {
  CURRENT_CONSENT_VERSION,
  type CheckAccessResponse,
  type ConsentState,
} from "@/lib/types";

type ConsentDraft = Pick<
  ConsentState,
  "telemetryAccepted" | "feedbackInformedAccepted" | "contactAccepted"
>;

const initialConsent: ConsentDraft = {
  telemetryAccepted: false,
  feedbackInformedAccepted: false,
  contactAccepted: false,
};

function consentIsCurrent(data: Partial<ConsentState> | undefined) {
  return (
    data?.telemetryAccepted === true &&
    data.feedbackInformedAccepted === true &&
    typeof data.consentVersion === "number" &&
    data.consentVersion >= CURRENT_CONSENT_VERSION
  );
}

export function ConsentForm() {
  const [user, authLoading] = useAuthState(auth);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessConfirmed, setAccessConfirmed] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [consent, setConsent] = useState<ConsentDraft>(initialConsent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setAccessConfirmed(false);
      router.replace("/");
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    async function checkAccessAndConsent() {
      setCheckingAccess(true);
      setCheckingConsent(true);
      setError(null);

      try {
        const callable = httpsCallable<Record<string, never>, CheckAccessResponse>(
          functions,
          "checkAccess",
        );
        const response = await callable({});

        if (cancelled) {
          return;
        }

        if (!response.data.allowed) {
          setAccessConfirmed(false);
          setCheckingConsent(false);
          router.replace("/access");
          return;
        }

        setAccessConfirmed(true);
      } catch {
        if (!cancelled) {
          setAccessConfirmed(false);
          setError("Kunde inte kontrollera åtkomst. Försök igen.");
          setCheckingConsent(false);
        }
        return;
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }

      try {
        const snapshot = await getDoc(
          doc(db, "users", uid, "consent", "current"),
        );

        if (cancelled) {
          return;
        }

        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<ConsentState>;
          if (consentIsCurrent(data)) {
            router.replace("/ny");
            return;
          }

          setConsent({
            telemetryAccepted: data.telemetryAccepted === true,
            feedbackInformedAccepted: data.feedbackInformedAccepted === true,
            contactAccepted: data.contactAccepted === true,
          });
        }
      } catch {
        if (!cancelled) {
          setError("Kunde inte läsa samtyckesstatus. Försök igen.");
        }
      } finally {
        if (!cancelled) {
          setCheckingConsent(false);
        }
      }
    }

    void checkAccessAndConsent();

    return () => {
      cancelled = true;
    };
  }, [authLoading, checkAttempt, router, user]);

  function updateConsent(key: keyof ConsentDraft, value: boolean) {
    setConsent((current) => ({ ...current, [key]: value }));
  }

  async function signOutUser() {
    await signOut(auth);
    router.replace("/");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!user) {
      router.replace("/");
      return;
    }

    if (!accessConfirmed) {
      setError("Åtkomst behöver kontrolleras innan samtycke kan sparas.");
      return;
    }

    if (!consent.telemetryAccepted || !consent.feedbackInformedAccepted) {
      setError("Du behöver markera båda obligatoriska kryssrutorna.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid, "consent", "current"), {
        telemetryAccepted: consent.telemetryAccepted,
        feedbackInformedAccepted: consent.feedbackInformedAccepted,
        contactAccepted: consent.contactAccepted,
        acceptedAt: serverTimestamp(),
        consentVersion: CURRENT_CONSENT_VERSION,
      });
      router.replace("/ny");
    } catch {
      setError("Kunde inte spara samtycket. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || checkingAccess || checkingConsent) {
    const loadingMessage = authLoading ?
      "Laddar inloggning..." :
      checkingAccess ?
        "Kontrollerar åtkomst..." :
        "Kontrollerar samtycke...";

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-sm text-[var(--muted)] shadow-sm">
          {loadingMessage}
        </p>
      </main>
    );
  }

  return (
    <main className="page-enter flex-1 px-4 py-8 md:px-8">
      <form
        className="mx-auto grid max-w-3xl gap-6 rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.92)] p-6 shadow-xl shadow-stone-900/5 md:p-9"
        onSubmit={submit}
      >
        <div className="grid gap-4 text-base leading-8 text-[var(--ink)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
                {consentCopy.title}
              </h1>
              {user?.email ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Inloggad som {user.email}
                </p>
              ) : null}
            </div>
            <button
              className="w-fit rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--accent)]"
              onClick={signOutUser}
              type="button"
            >
              Logga ut
            </button>
          </div>
          {consentCopy.paragraphs.map((paragraph) => {
            const [prefix, rest] = paragraph.split(": ");
            return rest ? (
              <p key={paragraph}>
                <strong>{prefix}:</strong> {rest}
              </p>
            ) : (
              <p key={paragraph}>{paragraph}</p>
            );
          })}
        </div>

        <p className="rounded-[1.25rem] border border-[var(--line)] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
          {consentPageLink.beforeLink}
          <Link
            className="font-bold text-[var(--accent-strong)] underline-offset-4 hover:underline"
            href="/om"
            target="_blank"
          >
            {consentPageLink.linkText}
          </Link>
          {consentPageLink.afterLink}
        </p>

        <div className="grid gap-3">
          <label className="flex gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
            <input
              checked={consent.telemetryAccepted}
              className="mt-1"
              onChange={(event) =>
                updateConsent("telemetryAccepted", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              Jag förstår att tekniska uppgifter alltid loggas.{" "}
              <strong>(Obligatorisk)</strong>
            </span>
          </label>
          <label className="flex gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
            <input
              checked={consent.feedbackInformedAccepted}
              className="mt-1"
              onChange={(event) =>
                updateConsent(
                  "feedbackInformedAccepted",
                  event.target.checked,
                )
              }
              type="checkbox"
            />
            <span>
              Jag förstår att jag själv väljer om jag ger återkoppling, och vad
              det innebär. <strong>(Obligatorisk)</strong>
            </span>
          </label>
          <label className="flex gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
            <input
              checked={consent.contactAccepted}
              className="mt-1"
              onChange={(event) =>
                updateConsent("contactAccepted", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              Jag godkänner att projektägaren får kontakta mig vid uppföljande
              frågor. <strong>(Valfri)</strong>
            </span>
          </label>
        </div>

        {error ? (
          <div className="grid gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-[var(--danger)]">
            <p>{error}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-white px-4 py-2 font-bold text-[var(--danger)] transition hover:bg-red-100"
                onClick={() => {
                  setError(null);
                  setCheckAttempt((current) => current + 1);
                }}
                type="button"
              >
                Försök igen
              </button>
              <button
                className="rounded-full bg-[var(--ink)] px-4 py-2 font-bold text-[var(--paper)] transition hover:bg-black"
                onClick={signOutUser}
                type="button"
              >
                Logga ut
              </button>
            </div>
          </div>
        ) : null}

        <button
          className="rounded-full bg-[var(--accent)] px-6 py-4 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
          disabled={
            saving ||
            !accessConfirmed ||
            !consent.telemetryAccepted ||
            !consent.feedbackInformedAccepted
          }
          type="submit"
        >
          {saving ? "Sparar samtycke..." : "Godkänn och fortsätt"}
        </button>
      </form>
    </main>
  );
}
