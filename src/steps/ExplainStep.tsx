
import { Check, Lock, Mic, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PROMISE_CARDS, cardById } from "../../shared/cards";
import { findHedges } from "../../shared/hedges";
import { SAMPLE_EXPLANATION } from "../../shared/sample";
import { countLines } from "../../shared/sourceFiles";
import type { SourceFile } from "../../shared/types";
import { Alert, Button, Spinner, StepHeading, cx } from "../ui";

interface Props {
  files: SourceFile[];
  card: string;
  explanation: string;
  usingSample: boolean;
  busy: boolean;
  error: string | null;
  onCard: (id: string) => void;
  onExplanation: (text: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const GUIDE_SECONDS = 90;

function useElapsed(running: boolean) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (running && start === null) setStart(Date.now());
  }, [running, start]);

  useEffect(() => {
    if (start === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [start]);

  return start === null ? 0 : Math.floor((now - start) / 1000);
}

export function ExplainStep({
  files,
  card,
  explanation,
  usingSample,
  busy,
  error,
  onCard,
  onExplanation,
  onBack,
  onSubmit,
}: Props) {
  const selected = cardById(card);
  const elapsed = useElapsed(explanation.length > 0);
  const words = explanation.trim()
    ? explanation.trim().split(/\s+/).length
    : 0;
  const hedges = findHedges(explanation).length;
  const lines = files.reduce((n, f) => n + countLines(f.content), 0);
  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <section className="rise">
      <StepHeading
        index="02"
        title={
          <>
            Explain it <em className="italic">out loud.</em>
          </>
        }
        lede="Choose a question and explain the feature in your own words. Use Wispr Flow if you like, or type directly. Don't open the code first—include what you're confident about and what you're unsure of."
      />

      <fieldset>
        <legend className="text-sm font-medium">
          <span className="mr-2 font-mono text-xs text-muted">01</span>
          Which question are you answering?
        </legend>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISE_CARDS.map((c, i) => {
            const active = c.id === card;

            return (
              <label
                key={c.id}
                className={cx(
                  "group relative flex min-h-[100px] cursor-pointer flex-col rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  active
                    ? "border-ink bg-marker/10 shadow-card"
                    : "border-rule bg-card hover:border-rule-strong hover:bg-paper-2/60",
                )}
              >
                <input
                  type="radio"
                  name="card"
                  value={c.id}
                  checked={active}
                  onChange={() => onCard(c.id)}
                  className="sr-only"
                />

                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.67rem] uppercase tracking-wider text-muted">
                    Question 0{i + 1}
                  </span>
                  <span
                    className={cx(
                      "flex size-5 items-center justify-center rounded-full border",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule-strong text-transparent",
                    )}
                  >
                    <Check aria-hidden className="size-3" />
                  </span>
                </span>

                <span className="mt-3 text-sm font-medium leading-snug text-ink">
                  {c.title}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {selected && (
        <div className="mt-8 border-l-[3px] border-marker bg-card px-5 py-5 sm:px-6">
          <p className="font-mono text-[0.67rem] uppercase tracking-[0.15em] text-muted">
            Your prompt
          </p>
          <p className="mt-3 font-serif text-[1.45rem] leading-snug tracking-tight text-ink sm:text-[1.7rem]">
            {selected.question}
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-2">
            {selected.hint}
          </p>
        </div>
      )}

      <div className="mt-7 overflow-hidden rounded-xl border border-rule-strong bg-card shadow-card focus-within:border-ink">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-2">
            <Mic aria-hidden className="size-4" />
            Your explanation
          </span>
          <span
            className={cx(
              "rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums",
              elapsed > GUIDE_SECONDS
                ? "border-bad/40 bg-bad-bg text-bad"
                : "border-rule bg-paper-2 text-muted",
            )}
            aria-label="Elapsed time and suggested duration"
          >
            {mm} / 1:30
          </span>
        </div>

        <label htmlFor="explanation" className="sr-only">
          Your explanation
        </label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => onExplanation(e.target.value)}
          rows={9}
          maxLength={6000}
          placeholder="When someone presses save, I think the app first…"
          className="ruled block min-h-[240px] w-full resize-y bg-transparent px-4 py-4 font-serif text-[1.08rem] leading-9 text-ink placeholder:text-muted focus:outline-none sm:px-5"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="tabular-nums">
              <strong className="font-medium text-ink-2">{words}</strong>{" "}
              words
            </span>
            <span className="tabular-nums">
              <strong className={cx("font-medium", hedges ? "text-ink" : "text-muted")}>
                {hedges}
              </strong>{" "}
              hedge words
            </span>
            <span className="tabular-nums">{explanation.length}/6000</span>
          </div>

          {usingSample && explanation.trim() !== SAMPLE_EXPLANATION && (
            <button
              type="button"
              className="text-xs font-medium text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink"
              onClick={() => onExplanation(SAMPLE_EXPLANATION)}
            >
              Insert sample explanation
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-rule bg-paper-2/60 px-4 py-4 sm:px-5">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-2" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Your code stays locked</p>
          <p className="mt-1 text-sm leading-6 text-ink-2">
            {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
            {lines.toLocaleString()} lines loaded. Your explanation is converted
            into claims before the code is examined.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-rule px-4 py-3 text-sm leading-6 text-ink-2 sm:px-5">
        <Sparkles aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
        <p>
          <strong className="font-medium text-ink">A useful rule:</strong>{" "}
          don't aim for a perfect explanation. Describe what you think happens
          and where your understanding gets fuzzy.
        </p>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-rule pt-5 sm:mt-10 sm:pt-6">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          ← Back
        </Button>

        {busy ? (
          <Spinner label="Finding claims in your explanation…" />
        ) : (
          <Button
            variant="primary"
            disabled={explanation.trim().length < 20 || !selected}
            onClick={onSubmit}
            className="max-w-[75%]"
          >
            Turn this into claims <span aria-hidden>→</span>
          </Button>
        )}
      </div>
    </section>
  );
}
