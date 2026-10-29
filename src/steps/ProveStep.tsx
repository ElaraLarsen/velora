
import {
  Check,
  ClipboardCopy,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import { useState } from "react";
import { buildFixPrompt } from "../../shared/fixPrompt";
import type { CheckedVerdict, ConfirmedClaim } from "../../shared/types";
import { Alert, Button, Eyebrow, StepHeading, cx } from "../ui";

export type FindingStatus = "untested" | "confirmed" | "false_alarm";

export interface FindingState {
  status: FindingStatus;
  observation: string;
}

interface Props {
  claims: ConfirmedClaim[];
  verdicts: CheckedVerdict[];
  findings: Record<string, FindingState>;
  demo: boolean;
  onFinding: (claimId: string, state: FindingState) => void;
  onBack: () => void;
  onRestart: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <Check aria-hidden className="size-4" />
      ) : (
        <ClipboardCopy aria-hidden className="size-4" />
      )}
      {copied ? "Copied to clipboard" : "Copy fix prompt"}
    </Button>
  );
}

export function ProveStep({
  claims,
  verdicts,
  findings,
  demo,
  onFinding,
  onBack,
  onRestart,
}: Props) {
  const byId = new Map(claims.map((c) => [c.id, c]));
  const contradicted = verdicts.filter(
    (v) => v.verdict === "CONTRADICTED",
  );

  const states = contradicted.map(
    (v) =>
      findings[v.claimId] ?? {
        status: "untested" as const,
        observation: "",
      },
  );

  const tally = {
    confirmed: states.filter((s) => s.status === "confirmed").length,
    falseAlarm: states.filter((s) => s.status === "false_alarm").length,
    untested: states.filter((s) => s.status === "untested").length,
  };

  const completed = tally.confirmed + tally.falseAlarm;
  const progress =
    contradicted.length > 0
      ? (completed / contradicted.length) * 100
      : 0;

  return (
    <section className="rise space-y-6 sm:space-y-8">
      <StepHeading
        index="05"
        title="Prove it yourself."
        lede="An analysis is only the beginning. Run each test, record what actually happened, and decide whether the finding is real or a false alarm."
      />

      {demo && (
        <Alert tone="note">
          Demo mode: these findings come from the sample project's
          pre-written responses. They are not real discoveries.
        </Alert>
      )}

      {contradicted.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-rule bg-card">
          <div className="flex items-start gap-4 p-5 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-ok/20 bg-ok/10">
              <ShieldCheck
                aria-hidden
                className="size-5 text-ok"
              />
            </div>

            <div>
              <h2 className="font-serif text-xl leading-snug sm:text-2xl">
                No verified contradictions to test.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                That's a valid result, not a failure. If some claims
                remain unverifiable, upload the missing files or
                context identified earlier and check again.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section
            aria-label="Testing progress"
            className="rounded-xl border border-rule bg-card p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>Testing progress</Eyebrow>
                <p className="mt-1 font-serif text-3xl tabular-nums">
                  {completed}
                  <span className="text-muted">
                    {" "}
                    / {contradicted.length}
                  </span>
                </p>
              </div>

              <p
                className="text-sm text-muted"
                aria-live="polite"
                aria-atomic="true"
              >
                {tally.untested === 0
                  ? "All findings reviewed"
                  : `${tally.untested} ${
                      tally.untested === 1 ? "finding" : "findings"
                    } left to test`}
              </p>
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-paper-2"
              role="progressbar"
              aria-label="Findings reviewed"
              aria-valuemin={0}
              aria-valuemax={contradicted.length}
              aria-valuenow={completed}
            >
              <div
                className="h-full rounded-full bg-ok transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-ok/20 bg-ok/5 p-2.5 sm:p-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-ok">
                  Confirmed
                </p>
                <p className="mt-1 font-serif text-2xl tabular-nums text-ok">
                  {tally.confirmed}
                </p>
              </div>

              <div className="rounded-lg border border-unk/20 bg-unk/5 p-2.5 sm:p-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-unk">
                  False alarms
                </p>
                <p className="mt-1 font-serif text-2xl tabular-nums text-unk">
                  {tally.falseAlarm}
                </p>
              </div>

              <div className="rounded-lg border border-rule bg-paper-2 p-2.5 sm:p-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  Untested
                </p>
                <p className="mt-1 font-serif text-2xl tabular-nums text-ink">
                  {tally.untested}
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="Findings to test"
            className="space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
                Findings to test
              </h2>
              <span className="text-xs text-muted">
                {contradicted.length} total
              </span>
            </div>

            {contradicted.map((v, index) => {
              const claim = byId.get(v.claimId);
              if (!claim) return null;

              const state = findings[v.claimId] ?? {
                status: "untested" as const,
                observation: "",
              };

              const set = (patch: Partial<FindingState>) =>
                onFinding(v.claimId, { ...state, ...patch });

              const prompt = buildFixPrompt({
                claim,
                verdict: v,
                observation: state.observation,
              });

              return (
                <article
                  key={v.claimId}
                  className={cx(
                    "overflow-hidden rounded-xl border bg-card shadow-card transition-colors",
                    state.status === "confirmed"
                      ? "border-bad/40"
                      : state.status === "false_alarm"
                        ? "border-unk/30"
                        : "border-rule",
                  )}
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper-2/60 px-4 py-3 sm:px-5">
                    <span className="font-mono text-xs tracking-wide text-muted">
                      FINDING {String(index + 1).padStart(2, "0")}
                      {v.consequence !== "NONE" &&
                        ` · ${v.consequence.toLowerCase()} consequence`}
                    </span>

                    {state.status === "confirmed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/25 bg-bad/5 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-bad">
                        <ShieldCheck
                          aria-hidden
                          className="size-3.5"
                        />
                        Confirmed real
                      </span>
                    )}

                    {state.status === "false_alarm" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-unk/25 bg-unk/5 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-unk">
                        <ShieldX
                          aria-hidden
                          className="size-3.5"
                        />
                        False alarm
                      </span>
                    )}

                    {state.status === "untested" && (
                      <span className="rounded-full border border-rule bg-card px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                        Not tested
                      </span>
                    )}
                  </header>

                  <div className="space-y-5 p-4 sm:p-5">
                    <section>
                      <Eyebrow>The original claim</Eyebrow>
                      <p className="mt-2 break-words font-serif text-xl leading-snug text-ink sm:text-2xl">
                        “{claim.text}”
                      </p>
                    </section>

                    <section className="rounded-lg border border-rule bg-paper-2/50 p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md border border-rule bg-card font-mono text-xs text-ink-2">
                          {index + 1}
                        </span>
                        <Eyebrow>Manual test</Eyebrow>
                      </div>

                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink marker:font-mono marker:text-muted">
                        {v.manualTest.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>

                      {v.manualTest.expected && (
                        <div className="mt-4 border-t border-rule pt-3">
                          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                            Expected observation
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                            {v.manualTest.expected}
                          </p>
                        </div>
                      )}
                    </section>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        What happened when you tried it?
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">
                        Record the actual result. Your observation is
                        included in the generated fix prompt.
                      </span>

                      <textarea
                        value={state.observation}
                        onChange={(e) =>
                          set({ observation: e.target.value })
                        }
                        rows={3}
                        maxLength={800}
                        placeholder="Describe what you observed while testing..."
                        className="mt-3 block w-full resize-y rounded-lg border border-rule-strong bg-paper px-3 py-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                      />

                      <span className="mt-1.5 block text-right font-mono text-[0.65rem] text-muted">
                        {state.observation.length}/800
                      </span>
                    </label>

                    <div className="space-y-2">
                      <p className="text-xs text-muted">
                        Choose the result of your manual test.
                      </p>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant={
                            state.status === "confirmed"
                              ? "primary"
                              : "secondary"
                          }
                          aria-pressed={state.status === "confirmed"}
                          onClick={() =>
                            set({ status: "confirmed" })
                          }
                        >
                          <Check
                            aria-hidden
                            className="size-4"
                          />
                          Confirmed, it's real
                        </Button>

                        <Button
                          variant={
                            state.status === "false_alarm"
                              ? "primary"
                              : "secondary"
                          }
                          aria-pressed={state.status === "false_alarm"}
                          onClick={() =>
                            set({ status: "false_alarm" })
                          }
                        >
                          <X aria-hidden className="size-4" />
                          False alarm
                        </Button>

                        {state.status !== "untested" && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              set({ status: "untested" })
                            }
                          >
                            <RotateCcw
                              aria-hidden
                              className="size-4"
                            />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {state.status === "confirmed" && (
                    <section className="border-t border-ok/20 bg-ok/5 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Eyebrow>Next step</Eyebrow>
                          <h3 className="mt-1 font-serif text-lg">
                            Generate a fix prompt
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            Give your AI builder the verified finding
                            and your testing notes.
                          </p>
                        </div>

                        <CopyButton text={prompt} />
                      </div>

                      <details className="group mt-4 overflow-hidden rounded-lg border border-rule bg-card">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium hover:bg-paper-2 [&::-webkit-details-marker]:hidden">
                          Preview fix prompt
                          <span className="font-mono text-xs text-muted transition-transform group-open:rotate-180">
                            ↓
                          </span>
                        </summary>

                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-rule bg-paper-2 p-3 font-mono text-xs leading-relaxed text-ink sm:p-4">
                          {prompt}
                        </pre>
                      </details>
                    </section>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}

      <footer className="flex flex-col-reverse gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back to evidence
        </Button>

        <Button variant="secondary" onClick={onRestart}>
          <RotateCcw aria-hidden className="size-4" />
          Check another feature
        </Button>
      </footer>
    </section>
  );
}
