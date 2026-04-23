"use client";

import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[rgb(255_250_240_/_0.78)] px-4 py-5 text-center text-sm leading-6 text-[var(--muted)] md:px-8">
      Examdesign är en prototyp under utveckling.{" "}
      <Link
        className="font-bold text-[var(--accent-strong)] underline-offset-4 hover:underline"
        href="/om"
      >
        Om verktyget
      </Link>{" "}
      ·{" "}
      <Link
        className="font-bold text-[var(--accent-strong)] underline-offset-4 hover:underline"
        href="/samtycke"
      >
        Datahantering
      </Link>
    </footer>
  );
}
