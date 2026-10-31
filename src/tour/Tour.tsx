import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { HackathonSection, Mode, Step } from "../project/types";
import { Button, cx } from "../ui";

export interface TourStop {
  title: string;
  body: string;
  mode: Mode;
  /** Studio step to show, when the project has already reached it. */
  step?: Step;
  section?: HackathonSection;
}

// Short by design: one idea per stop. The tour only changes which screen is open, never the project.
export const TOUR: TourStop[] = [
  {
    title: "Welcome to Velora",
    body: "Velora checks what you believe about your AI-built app against the code itself. You explain a feature, Velora turns that into claims, and each claim is checked for quotes that really appear in your files.",
    mode: "studio",
    step: 1,
    // Leaves Hackathon on its first section for later.
    section: "readiness",
  },
  { title: "Studio · 1 Load", body: "Load the files behind one feature (up to 12 files, 250 KB in total) or try the sample project. Velora only ever reads what you load here.", mode: "studio", step: 1 },
  { title: "Studio · 2 Explain", body: "Explain the feature in your own words before you see any code. Writing it down shows where your understanding is thin.", mode: "studio", step: 2 },
  { title: "Studio · 3 Claims", body: "Your explanation becomes separate, checkable claims. You confirm, edit or delete each one. The code stays locked until you've committed.", mode: "studio", step: 3 },
  {
    title: "Studio · 4 Evidence",
    body: "Each claim is marked supported, contradicted or not verifiable. A finding counts only if its quote appears word for word in your files; anything else is downgraded, so nothing is invented.",
    mode: "studio",
    step: 4,
  },
  { title: "Studio · 5 Prove", body: "Static reading can't show runtime behaviour, so contradicted claims come with a manual test. You run it and record what happened.", mode: "studio", step: 5 },
  {
    title: "Studio | Hackathon",
    body: "The switch at the top changes the view, not the project. Both modes share the same files, claims and results, and switching back returns you exactly where you were.",
    mode: "hackathon",
    section: "readiness",
  },
  { title: "Readiness", body: "What's done, what's missing among your uploaded files, and what to check before you demo. A checklist, not a certification.", mode: "hackathon", section: "readiness" },
  { title: "Tech stack", body: "Technologies found in your files, each with its file and line. Anything named only in your description is labelled an assumption.", mode: "hackathon", section: "stack" },
  { title: "Claim audit", body: "Every claim labelled Verified, Contradicted, Potential risk, Assumption or Unknown, straight from the evidence check.", mode: "hackathon", section: "audit" },
  { title: "Judge Q&A", body: "Questions judges ask, answered only from your verified evidence and your own tests. Anything the evidence can't answer is marked for you to prepare.", mode: "hackathon", section: "judge" },
  { title: "Report", body: "Everything as one Markdown file to download or copy, with demo results clearly labelled.", mode: "hackathon", section: "report" },
  { title: "Planner", body: "Enter the official submission deadline for a live countdown, then add tasks, milestones and, for teams, owners. Reminders show inside Velora while it's open.", mode: "hackathon", section: "planner" },
  { title: "Submission", body: "A checklist of deliverables you can adapt to your hackathon's rules, with time left and what's still missing.", mode: "hackathon", section: "guardian" },
  { title: "Rubric", body: "Enter the judging criteria and weights, score yourself, and see your weak areas. It's your estimate, never an official score.", mode: "hackathon", section: "rubric" },
  {
    title: "That's the tour",
    body: "Everything lives in this browser tab only, so refreshing discards it; download the report to keep your work. Reopen the tour any time from the compass button at the top.",
    mode: "studio",
    step: 1,
    // Leaves Hackathon on its first section for later.
    section: "readiness",
  },
];

export function TourCard({ index, onIndex, onClose }: { index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const stop = TOUR[index] ?? TOUR[0]!;
  const last = index === TOUR.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      className="fixed inset-x-3 bottom-3 z-30 rounded-xl border border-rule-strong bg-paper/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
          <Compass aria-hidden className="size-3.5" />
          Guided tour · {index + 1} of {TOUR.length}
        </p>
        <button onClick={onClose} aria-label="Close the tour" className="-m-2 inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <h2 id="tour-title" ref={heading} tabIndex={-1} className="mt-2 font-serif text-[1.3rem] font-bold leading-snug text-ink focus:outline-none">
        {stop.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{stop.body}</p>
      <div aria-hidden className="mt-4 h-1 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-ink/70 transition-[width]" style={{ width: `${((index + 1) / TOUR.length) * 100}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onClose}>
          {last ? "Close" : "Skip tour"}
        </Button>
        <div className="flex gap-2">
          {index > 0 && (
            <Button onClick={() => onIndex(index - 1)} aria-label="Previous stop">
              <ArrowLeft aria-hidden className="size-4" />
            </Button>
          )}
          {last ? (
            <Button variant="primary" onClick={() => onIndex(0)}>
              Restart
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onIndex(index + 1)}>
              Next
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A quiet first-visit invitation; dismissing it is final for this visit. */
// On phones it sits in the page under the mode switch, so it never covers a primary action; on wider screens it floats bottom-right.
export function TourInvite({ onStart, onDismiss, inline = false }: { onStart: () => void; onDismiss: () => void; inline?: boolean }) {
  return (
    <div
      role="region"
      aria-label="Guided tour"
      className={cx(
        "flex items-center gap-3 rounded-xl border border-rule-strong bg-paper/95 px-4 py-3 backdrop-blur",
        inline ? "sm:hidden" : "fixed bottom-6 right-6 z-30 hidden max-w-sm shadow-2xl sm:flex",
      )}
    >
      <Compass aria-hidden className="size-5 shrink-0 text-highlight" />
      <p className="min-w-0 flex-1 text-sm text-ink-2">New to Velora? A one-minute tour of both modes.</p>
      <Button variant="primary" onClick={onStart} className="shrink-0">
        Take the tour
      </Button>
      <button onClick={onDismiss} aria-label="Dismiss the tour invitation" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
