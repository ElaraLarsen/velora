import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DeadlineClock } from "../deadlines/DeadlineClock";
import { DeployCheck } from "../deploy/DeployCheck";
import { useProject } from "../project/store";
import type { ChecklistItem, HackathonSection } from "../project/types";
import { Button, cx } from "../ui";
import { guardian } from "./analysis/guardian";
import { newId, zoneLabel } from "./analysis/planner";
import { FIELD, useNow } from "./Planner";
import { SectionHeading, SectionTitle } from "./parts";

const VERDICT_TONE = { ok: "text-ok", warn: "text-highlight", bad: "text-bad", neutral: "text-ink-2" };

export function Guardian({ onSection, onOpenStudio }: { onSection: (s: HackathonSection) => void; onOpenStudio: () => void }) {
  const { project, dispatch } = useProject();
  const items = project.checklist;
  const update = (fn: (items: ChecklistItem[]) => ChecklistItem[]) => dispatch({ type: "updateChecklist", update: fn });
  const now = useNow(1000);
  const summary = guardian(items, project.planner, now);
  const submission = project.planner.submission;
  const [label, setLabel] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) return;
    update((xs) => [...xs, { id: newId("c"), label: l, done: false, note: "" }]);
    setLabel("");
  }

  return (
    <section aria-labelledby="hk-guardian">
      <SectionHeading
        label="Hackathon · Submission"
        title={<span id="hk-guardian">Nothing left <em>behind</em>.</span>}
        lede="The deliverables your submission needs, ticked off as you finish them. Remove anything your hackathon doesn't ask for and add what it does; every competition is different."
      />

      <div className="mb-10 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-rule bg-card px-4 py-5 sm:px-6">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">Submission readiness</p>
          <p className={cx("mt-3 font-serif text-[1.35rem] leading-snug", VERDICT_TONE[summary.verdict.tone])}>{summary.verdict.text}</p>
          {summary.total > 0 && (
            <>
              <div role="progressbar" aria-label="Deliverables ticked" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${summary.percent}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {summary.done} of {summary.total} ticked · {summary.percent}%. Ticks are your own; Velora doesn't check the deliverables exist.
              </p>
            </>
          )}
          {summary.missing.length > 0 && (
            <p className="mt-3 text-sm text-ink-2">
              <span className="text-ink">Still missing: </span>
              {summary.missing.map((m) => m.label).join(", ")}.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-rule bg-card px-4 py-5 sm:px-6">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">Time left</p>
          {submission !== null ? (
            <div className="mt-3 space-y-4">
              <DeadlineClock label="Official deadline" at={submission} now={now} compact />
              {project.planner.personal !== null && <DeadlineClock label="My deadline" at={project.planner.personal} now={now} compact tone="personal" />}
              <p className="text-xs text-muted">{zoneLabel(now)}</p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink-2">No submission deadline entered yet. Velora never guesses it.</p>
              <Button className="mt-3" onClick={() => onSection("planner")}>
                Enter it in the Planner
              </Button>
            </>
          )}
        </div>
      </div>

      <SectionTitle aside={`${summary.done} of ${summary.total}`}>Deliverables</SectionTitle>
      {items.length ? (
        <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
              <button
                aria-pressed={item.done}
                onClick={() => update((xs) => xs.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))}
                className="flex min-h-10 min-w-0 flex-1 basis-56 items-center gap-3 text-left"
              >
                {item.done ? <CheckCircle2 aria-hidden className="size-5 shrink-0 text-ok" /> : <Circle aria-hidden className="size-5 shrink-0 text-ink-2" />}
                <span className={cx("break-words text-sm", item.done ? "text-ink-2 line-through" : "text-ink")}>{item.label}</span>
                <span className="sr-only">{item.done ? "(done)" : "(missing)"}</span>
              </button>
              <label htmlFor={`note-${item.id}`} className="sr-only">
                Link or note for {item.label}
              </label>
              <input
                id={`note-${item.id}`}
                value={item.note}
                onChange={(e) => update((xs) => xs.map((x) => (x.id === item.id ? { ...x, note: e.target.value } : x)))}
                placeholder="Link or note (optional)"
                className={cx(FIELD, "min-w-0 flex-1 basis-48 text-xs")}
              />
              <button
                onClick={() => update((xs) => xs.filter((x) => x.id !== item.id))}
                aria-label={`Remove ${item.label} from the checklist`}
                className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-bad"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-rule-strong px-4 py-6 text-sm text-ink-2">The checklist is empty. Add the deliverables your hackathon asks for.</p>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="gd-add" className="sr-only">
          New deliverable
        </label>
        <input id="gd-add" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a deliverable your rules require" className={cx(FIELD, "min-w-0 flex-1 sm:max-w-md")} />
        <Button type="submit" disabled={!label.trim()}>
          <Plus aria-hidden className="size-4" />
          Add item
        </Button>
      </form>
      <DeployCheck files={project.files} onLoad={onOpenStudio} />

      <p className="mt-6 text-sm leading-relaxed text-muted">
        The checklist is kept in memory with the rest of the project; refreshing or closing Velora discards it. The Report section includes it in the
        Markdown download.
      </p>
    </section>
  );
}
