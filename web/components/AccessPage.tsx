"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";

import {
  auth,
  connectFirebaseEmulatorsIfNeeded,
  db,
  functions,
} from "@/lib/firebase";
import {
  CURRENT_CONSENT_VERSION,
  type CheckAccessResponse,
  type ConsentState,
  type RedeemInviteCodeResponse,
} from "@/lib/types";

function consentIsCurrent(data: Partial<ConsentState> | undefined) {
  return (
    data?.telemetryAccepted === true &&
    data.feedbackInformedAccepted === true &&
    typeof data.consentVersion === "number" &&
    data.consentVersion >= CURRENT_CONSENT_VERSION
  );
}

async function getPostAccessRoute(uid: string): Promise<"/ny" | "/samtycke"> {
  const snapshot = await getDoc(doc(db, "users", uid, "consent", "current"));
  if (!snapshot.exists()) {
    return "/samtycke";
  }

  const data = snapshot.data() as Partial<ConsentState>;
  return consentIsCurrent(data) ? "/ny" : "/samtycke";
}

async function checkCurrentAccess(): Promise<CheckAccessResponse> {
  const callable = httpsCallable<Record<string, never>, CheckAccessResponse>(
    functions,
    "checkAccess",
  );
  const response = await callable({});
  return response.data;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Koden kunde inte lösas in. Kontrollera koden och försök igen.";
}

export function AccessPage() {
  const [user, authLoading] = useAuthState(auth);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    connectFirebaseEmulatorsIfNeeded();
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCheckingAccess(false);
      return;
    }

    let cancelled = false;

    async function verifyAccessAndRedirect(currentUser: User) {
      setCheckingAccess(true);
      setError(null);
      try {
        const access = await checkCurrentAccess();
        if (cancelled) {
          return;
        }

        if (access.allowed) {
          const route = await getPostAccessRoute(currentUser.uid);
          if (!cancelled) {
            router.replace(route);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Kunde inte kontrollera åtkomst. Försök igen.");
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    void verifyAccessAndRedirect(user);

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, user]);

  async function signIn() {
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setAuthError("Inloggningen avbröts eller kunde inte slutföras.");
    }
  }

  async function signOutUser() {
    await signOut(auth);
    setInviteCode("");
    setError(null);
    setStatus(null);
    router.replace("/");
  }

  async function redeemCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!user) {
      setError("Du behöver vara inloggad för att lösa in en kod.");
      return;
    }

    const code = inviteCode.trim();
    if (!code) {
      setError("Ange en inbjudningskod.");
      return;
    }

    setRedeeming(true);
    try {
      const callable = httpsCallable<
        { code: string },
        RedeemInviteCodeResponse
      >(functions, "redeemInviteCode");
      await callable({ code });
      setStatus("Koden är löst in. Kontrollerar åtkomst...");

      const access = await checkCurrentAccess();
      if (!access.allowed) {
        setError("Koden löstes in men åtkomst kunde inte bekräftas.");
        return;
      }

      const route = await getPostAccessRoute(user.uid);
      router.replace(route);
    } catch (caughtError) {
      setError(toFriendlyError(caughtError));
    } finally {
      setRedeeming(false);
    }
  }

  if (authLoading || checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-sm text-[var(--muted)] shadow-sm">
          Kontrollerar åtkomst...
        </p>
      </main>
    );
  }

  return (
    <main className="page-enter flex-1 px-4 py-8 md:px-8">
      <section className="mx-auto grid max-w-3xl gap-6 rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.92)] p-6 shadow-xl shadow-stone-900/5 md:p-9">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
              Åtkomst
            </p>
            <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
              Begränsad testfas
            </h1>
          </div>
          {user ? (
            <button
              className="w-fit rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--accent)]"
              onClick={signOutUser}
              type="button"
            >
              Logga ut
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 text-base leading-8 text-[var(--ink)]">
          <p>
            Verktyget är en prototyp under utveckling och är i begränsad
            testfas. För att få tillgång behöver du antingen vara tillagd av
            projektansvarig eller ha fått en inbjudningskod.
          </p>
          <p>Har du en inbjudningskod? Ange den nedan.</p>
        </div>

        {!user ? (
          <div className="grid gap-4 rounded-[1.25rem] border border-[var(--line)] bg-white/70 p-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              Logga in med Google först. Därefter kan du lösa in din
              inbjudningskod.
            </p>
            <button
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
              onClick={signIn}
              type="button"
            >
              Logga in med Google
            </button>
            {authError ? (
              <p className="rounded-2xl bg-red-50 p-3 text-sm text-[var(--danger)]">
                {authError}
              </p>
            ) : null}
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={redeemCode}>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--ink)]">
                Inbjudningskod
              </span>
              <input
                autoComplete="one-time-code"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-900/10"
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="PROTO-2026-ABC123"
                type="text"
                value={inviteCode}
              />
            </label>
            <button
              className="rounded-full bg-[var(--accent)] px-6 py-4 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
              disabled={redeeming}
              type="submit"
            >
              {redeeming ? "Löser in kod..." : "Lös in kod"}
            </button>
          </form>
        )}

        {status ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <p className="rounded-[1.25rem] border border-[var(--line)] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
          Saknar du kod? Kontakta projektansvarig för inbjudan.
        </p>
      </section>
    </main>
  );
}
