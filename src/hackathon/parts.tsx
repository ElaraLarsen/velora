// Small building blocks shared by the Hackathon sections. They use the existing design system:
// the step heading treatment, tinted verdict badges, and the Phase 2 card and tile surfaces.

import { CheckCircle2, Circle, AlertCircle, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Eyebrow, cx } from "../ui";
import type { EvidenceRef } from "./analysis/stack";

/** Same treatment as the Studio step headings, with a Hackathon label instead of a step number. */
export function SectionHeading({ label, title, lede }: { label: string; title: ReactNode; lede: ReactNode }) {
  return (
    <header className="hw-step-head mb-8 sm:mb-10">
      <Eyebrow>{label}</Eyebrow>
      <h1 className="mt-3 max-w-[22ch] font-serif text-[2.4rem] font-bold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[3.33rem] [&_em]:font-normal [&_em]:text-highlight">
        {title}
      </h1>
      <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-7 text-ink-2 sm:text-[1.1875rem] sm:leading-[1.6]">{lede}</p>
    </header>
  );
}

/** A tinted badge, the same style as the verdict stamps. `tone` is a text colour class. */
export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cx("stamp inline-flex items-center gap-1.5 rounded-sm px-2 py-1", tone)}>{children}</span>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">{children}</h2>
      {aside && <span className="text-xs text-muted">{aside}</span>}
    </div>
  );
}

const STATUS_ICON = {
  done: <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />,
  todo: <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />,
  warn: <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-highlight" />,
};
const STATUS_TEXT = { done: "Done", todo: "To do", warn: "Needs attention" };

export function CheckRow({ status, label, detail }: { status: "done" | "todo" | "warn"; label: string; detail: ReactNode }) {
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      {STATUS_ICON[status]}
      <div className="min-w-0">
        <p className="text-sm text-ink">
          <span className="sr-only">{STATUS_TEXT[status]}: </span>
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{detail}</p>
      </div>
    </li>
  );
}

/**
 * Lines cut from uploaded files. While Studio still keeps the code locked (before the evidence
 * step), only file names and line numbers are shown, never the code itself.
 */
export function EvidenceList({ evidence, unlocked, max = 6 }: { evidence: EvidenceRef[]; unlocked: boolean; max?: number }) {
  if (!evidence.length) return null;
  const shown = evidence.slice(0, max);
  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {shown.map((e, i) => (
          <li key={`${e.file}:${e.line}:${i}`} className="min-w-0 rounded-lg bg-paper-2 px-3 py-2">
            <span className="block break-all font-mono text-[0.72rem] text-ink-2">
              {e.file}
              {e.line ? <span className="text-muted"> · line {e.line}</span> : null}
            </span>
            {unlocked && e.text ? <code className="mt-1 block overflow-x-auto whitespace-pre font-mono text-[0.75rem] text-ink">{e.text}</code> : null}
          </li>
        ))}
      </ul>
      {evidence.length > max && <p className="mt-1.5 text-xs text-muted">and {evidence.length - max} more</p>}
      {!unlocked && evidence.some((e) => e.text) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Lock aria-hidden className="size-3" />
          Code lines stay hidden until you've explained the feature and checked your claims in Studio.
        </p>
      )}
    </div>
  );
}
