"use client";

import * as Popover from "@radix-ui/react-popover";
import { useId } from "react";

interface InfoTooltipProps {
  ariaLabel: string;
  children: React.ReactNode;
}

export function InfoTooltip({ ariaLabel, children }: InfoTooltipProps) {
  const id = useId();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-describedby={id}
          aria-label={ariaLabel}
          className="inline-flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-white/90 text-xs font-bold text-[var(--accent-strong)] transition hover:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-teal-900/10"
          type="button"
        >
          ?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          avoidCollisions
          className="z-[1000] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-sm font-normal leading-6 text-[var(--ink)] opacity-100 shadow-2xl shadow-stone-900/25 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          collisionPadding={16}
          id={id}
          role="tooltip"
          side="bottom"
          sideOffset={8}
        >
          <div className="grid gap-3">{children}</div>
          <Popover.Arrow className="fill-[var(--paper)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
