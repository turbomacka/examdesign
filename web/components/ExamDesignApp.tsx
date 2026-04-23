"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuthState } from "react-firebase-hooks/auth";

import { DesignForm } from "@/components/DesignForm";
import { HistoryPage } from "@/components/HistoryPage";
import { ResultView } from "@/components/ResultView";
import {
  auth,
  connectFirebaseEmulatorsIfNeeded,
  db,
  functions,
} from "@/lib/firebase";
import { formIngress } from "@/lib/uiMicrotexts";
import type {
  CheckAccessResponse,
  ConsentState,
  ExamDesignInput,
  ExamDesignResult,
  IsAdminResponse,
  StoredDesign,
} from "@/lib/types";
import { CURRENT_CONSENT_VERSION } from "@/lib/types";

type AppView = "form" | "history" | "result";
type AccessStatus = "idle" | "checking" | "allowed" | "denied";

interface ExamDesignAppProps {
  initialView: "form" | "history";
}

interface AccessState {
  uid: string;
  status: AccessStatus;
}

interface CurrentResult {
  designId: string;
  result: ExamDesignResult;
  input?: ExamDesignInput;
  model?: string;
}

export function ExamDesignApp({ initialView }: ExamDesignAppProps) {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState<AppView>(initialView);
  const [currentResult, setCurrentResult] = useState<CurrentResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<AccessState>({
    uid: "",
    status: "idle",
  });
  const [consentLoading, setConsentLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const currentAccessStatus =
    user && accessState.uid === user.uid ? accessState.status : "idle";
  const accessAllowed = Boolean(
    user && accessState.uid === user.uid && accessState.status === "allowed",
  );
  const accessPending = Boolean(
    user &&
      (currentAccessStatus === "idle" || currentAccessStatus === "checking"),
  );

  useEffect(() => {
    connectFirebaseEmulatorsIfNeeded();
  }, []);

  useEffect(() => {
    if (loading || !user) {
      setAccessState({ uid: "", status: "idle" });
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      try {
        const callable = httpsCallable<Record<string, never>, IsAdminResponse>(
          functions,
          "isAdmin",
        );
        const response = await callable({});
        if (!cancelled) {
          setIsAdmin(response.data.isAdmin);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  useEffect(() => {
    if (loading || !user) {
      setAccessState({ uid: "", status: "idle" });
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    async function verifyCurrentAccess() {
      setAccessState({ uid, status: "checking" });
      try {
        const callable = httpsCallable<Record<string, never>, CheckAccessResponse>(
          functions,
          "checkAccess",
        );
        const response = await callable({});
        if (cancelled) {
          return;
        }

        if (response.data.allowed) {
          setAccessState({ uid, status: "allowed" });
          return;
        }

        setAccessState({ uid, status: "denied" });
        router.replace("/access");
      } catch {
        if (!cancelled) {
          setAccessState({ uid, status: "denied" });
          router.replace("/access");
        }
      }
    }

    void verifyCurrentAccess();

    return () => {
      cancelled = true;
    };
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user || !accessAllowed) {
      setConsentLoading(false);
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    async function verifyCurrentConsent() {
      setConsentLoading(true);
      try {
        const snapshot = await getDoc(
          doc(db, "users", uid, "consent", "current"),
        );

        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          router.replace("/samtycke");
          return;
        }

        const data = snapshot.data() as Partial<ConsentState>;
        if (
          data.telemetryAccepted !== true ||
          data.feedbackInformedAccepted !== true ||
          typeof data.consentVersion !== "number" ||
          data.consentVersion < CURRENT_CONSENT_VERSION
        ) {
          router.replace("/samtycke");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/samtycke");
        }
      } finally {
        if (!cancelled) {
          setConsentLoading(false);
        }
      }
    }

    void verifyCurrentConsent();

    return () => {
      cancelled = true;
    };
  }, [accessAllowed, loading, router, user]);

  function showResult(nextResult: CurrentResult) {
    startTransition(() => {
      setCurrentResult(nextResult);
      setView("result");
    });
  }

  function openStoredDesign(design: StoredDesign) {
    showResult({
      designId: design.id,
      result: design.output,
      input: design.input,
      model: design.model,
    });
  }

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
    setCurrentResult(null);
    setView(initialView);
  }

  if (loading || accessPending || consentLoading) {
    const loadingMessage = loading ?
      "Laddar inloggning..." :
      accessPending ?
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

  if (!user) {
    return (
      <main className="page-enter flex min-h-screen items-center justify-center p-6">
        <section className="grid w-full max-w-5xl gap-8 rounded-[2rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.86)] p-6 shadow-2xl shadow-stone-900/10 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div className="stagger flex flex-col justify-between gap-10">
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                Produkt · process · agens
              </p>
              <h1 className="font-serif text-5xl leading-none tracking-tight text-[var(--ink)] md:text-7xl">
                Designa examination med tydlig inferens.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Mata in kursmål, nivå, ämne och begränsningar. Appen returnerar
              ett strukturerat examinationsförslag med artefaktval,
              bedömningsfokus, triangulerande underlag och inferens-kontroll.
            </p>
            <Link
              className="w-fit rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--accent)]"
              href="/om"
            >
              Om verktyget
            </Link>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--ink)] p-6 text-[var(--paper)] shadow-xl md:p-8">
            <h2 className="font-serif text-3xl">Logga in</h2>
            <p className="mt-4 text-sm leading-6 text-stone-300">
              Google är enda inloggningsmetod. Dina förslag sparas i din egen
              Firestore-yta under ditt användar-id.
            </p>
            <button
              className="mt-8 w-full rounded-full bg-[var(--accent-warm)] px-5 py-3 font-bold text-white transition hover:translate-y-[-1px] hover:bg-[#a94725]"
              onClick={signIn}
              type="button"
            >
              Logga in med Google
            </button>
            {authError ? (
              <p className="mt-4 rounded-2xl bg-red-950/40 p-3 text-sm text-red-100">
                {authError}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (!accessAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-sm text-[var(--muted)] shadow-sm">
          Omdirigerar till åtkomstsidan...
        </p>
      </main>
    );
  }

  return (
    <main className="page-enter min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.88)] p-5 shadow-xl shadow-stone-900/5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
              Examinationsdesigner
            </p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight md:text-5xl">
              Produkt · process · agens
            </h1>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-sm text-[var(--muted)]">{user.email}</p>
            <nav className="flex flex-wrap gap-2">
              <Link
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold transition hover:border-[var(--accent)]"
                href="/ny"
                onClick={() => setView("form")}
              >
                Ny design
              </Link>
              <Link
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold transition hover:border-[var(--accent)]"
                href="/history"
                onClick={() => setView("history")}
              >
                Historik
              </Link>
              <Link
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold transition hover:border-[var(--accent)]"
                href="/om"
              >
                Om verktyget
              </Link>
              {isAdmin ? (
                <Link
                  className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold transition hover:border-[var(--accent)]"
                  href="/admin"
                >
                  Admin
                </Link>
              ) : null}
              <button
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-[var(--paper)] transition hover:bg-black"
                onClick={signOutUser}
                type="button"
              >
                Logga ut
              </button>
            </nav>
          </div>
        </header>

        {view === "form" ? (
          <>
            <p className="max-w-[720px] rounded-[1.35rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.82)] p-5 text-base leading-8 text-[var(--muted)] shadow-sm shadow-stone-900/5">
              {formIngress.beforeLink}
              <Link
                className="font-bold text-[var(--accent-strong)] underline-offset-4 hover:underline"
                href="/om"
              >
                {formIngress.linkText}
              </Link>
            </p>
            <DesignForm onGenerated={showResult} />
          </>
        ) : null}
        {view === "history" ? (
          <HistoryPage userId={user.uid} onOpenDesign={openStoredDesign} />
        ) : null}
        {view === "result" && currentResult ? (
          <ResultView
            designId={currentResult.designId}
            input={currentResult.input}
            model={currentResult.model}
            result={currentResult.result}
          />
        ) : null}
      </div>
    </main>
  );
}
