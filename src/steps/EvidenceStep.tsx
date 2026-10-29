
import {
  ChevronDown,
  FileCode2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import type {
  CheckedVerdict,
  ConfirmedClaim,
  QuoteCheck,
  SourceFile,
} from "../../shared/types";
import type { VerdictSummary } from "../../shared/verdictRules";
import {
  Alert,
  Button,
  CodeLines,
  StepHeading,
  VERDICT_META,
  VerdictStamp,
  cx,
} from "../ui";

interface Props {
  claims: ConfirmedClaim[];
  verdicts: CheckedVerdict[];
  summary: VerdictSummary;
  files: SourceFile[];
  demo: boolean;
  sample: boolean;
  onBack: () => void;
  onNext: () => void;
}

const REJECT_REASON: Record<
  Exclude<QuoteCheck["status"], "verified">,
  string
> = {
  not_found: "not found in any uploaded file",
  wrong_file: "not in the file it was attributed to",
  too_short: "too short to count as evidence",
};

function Evidence({ q }: { q: QuoteCheck }) {
  const loc = q.location!;
  const extra = q.occurrences.length - 1;

  return (
    <figure className="overflow-hidden rounded-lg border border-ok/25 bg-card">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-paper-2 px-3 py-2 sm:px-4">
        <span className="min-w-0 break-all font-mono text-xs text-ink-2">
          {loc.file}
          <span className="text-muted">
            {" "}
            ·{" "}
            {loc.lineStart === loc.lineEnd
              ? `line ${loc.lineStart}`
              : `lines ${loc.lineStart}–${loc.lineEnd}`}
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-ok">
          <ShieldCheck aria-hidden className="size-3.5" />
          Verified
        </span>
      </figcaption>

      <CodeLines text={q.linesText!} firstLine={loc.lineStart} />

      {extra > 0 && (
        <p className="border-t border-rule bg-paper-2 px-3 py-2 text-xs leading-relaxed text-muted sm:px-4">
          Also appears on line
          {q.occurrences.slice(1).length > 1 ? "s " : " "}
          {q.occurrences
            .slice(1)
            .map((o) => o.lineStart)
            .join(", ")}
          .
        </p>
      )}
    </figure>
  );
}

function VerdictCard({
  claim,
  v,
  index,
}: {
  claim: ConfirmedClaim;
  v: CheckedVerdict;
  index: number;
}) {
  const meta = VERDICT_META[v.verdict];

  return (
    <article
      className={cx(
        "overflow-hidden rounded-xl border bg-card shadow-card transition-colors",
        v.verdict === "CONTRADICTED"
          ? "border-bad/40"
          : "border-rule",
      )}
    >
      <header
        className={cx(
          "flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 px-4 py-3 sm:px-5",
          meta.bg,
        )}
      >
        <span className="font-mono text-xs tracking-wide text-ink-2">
          CLAIM {String(index + 1).padStart(2, "0")}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {v.verdict === "CONTRADICTED" &&
            v.consequence !== "NONE" && (
              <span className="rounded-full border border-bad/25 bg-card/70 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-bad">
                {v.consequence} consequence
              </span>
            )}

          <VerdictStamp verdict={v.verdict} />
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <p className="break-words font-serif text-xl leading-snug text-ink sm:text-2xl">
          “{claim.text}”
        </p>

        <div className="border-l-2 border-rule pl-3 sm:pl-4">
          {v.downgradeReason === "no_verified_evidence" && (
            <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-unk">
              Unverified reasoning
            </p>
          )}

          <p className="text-sm leading-7 text-ink-2 sm:text-[0.95rem]">
            {v.explanation}
          </p>
        </div>

        {v.downgradeReason === "no_verified_evidence" &&
          v.proposedVerdict && (
            <div className="rounded-lg border border-rule bg-paper-2 p-3 sm:p-4">
              <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                Why this verdict changed
              </p>
              <p className="text-sm leading-relaxed text-ink-2">
                The analysis said{" "}
                <strong>
                  {VERDICT_META[v.proposedVerdict].label.toLowerCase()}
                </strong>
                , but none of its quotes could be found in your files.
                Handwave therefore marks this claim as{" "}
                <strong>not verifiable</strong>.
              </p>
            </div>
          )}

        {v.evidence.length > 0 && (
          <section className="space-y-3" aria-label="Verified evidence">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
                Verified evidence
              </h3>
              <span className="rounded-full bg-ok/10 px-2 py-1 font-mono text-[0.65rem] text-ok">
                {v.evidence.length}{" "}
                {v.evidence.length === 1 ? "quote" : "quotes"}
              </span>
            </div>

            {v.evidence.map((q, i) => (
              <Evidence key={i} q={q} />
            ))}
          </section>
        )}

        {v.rejectedQuotes.length > 0 && (
          <div className="rounded-lg border border-bad/20 bg-bad/5 p-3 sm:p-4">
            <div className="flex items-start gap-2.5">
              <ShieldX
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-bad"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {v.rejectedQuotes.length}{" "}
                  {v.rejectedQuotes.length === 1
                    ? "quote was"
                    : "quotes were"}{" "}
                  rejected
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  These quotes were not accepted as evidence.
                </p>

                <ul className="mt-3 space-y-2">
                  {v.rejectedQuotes.map((q, i) => (
                    <li
                      key={i}
                      className="break-words text-xs leading-relaxed text-ink-2"
                    >
                      <span className="font-mono">
                        {q.claimedFile || "No file specified"}
                      </span>
                      <span className="text-muted"> — </span>
                      {REJECT_REASON[
                        q.status as keyof typeof REJECT_REASON
                      ]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {(v.alternativeInterpretation || v.missingContext) && (
          <details className="group overflow-hidden rounded-lg border border-rule">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-medium transition-colors hover:bg-paper-2 sm:px-4 [&::-webkit-details-marker]:hidden">
              <span>What could change this verdict?</span>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>

            <dl className="space-y-4 border-t border-rule bg-paper-2/50 px-3 py-4 sm:px-4">
              {v.alternativeInterpretation && (
                <div>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    Another interpretation
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {v.alternativeInterpretation}
                  </dd>
                </div>
              )}

              {v.missingContext && (
                <div>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    Missing context
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {v.missingContext}
                  </dd>
                </div>
              )}
            </dl>
          </details>
        )}
      </div>
    </article>
  );
}

export function EvidenceStep({
  claims,
  verdicts,
  summary,
  files,
  demo,
  sample,
  onBack,
  onNext,
}: Props) {
  const byId = new Map(claims.map((c) => [c.id, c]));

  const stats = [
    {
      n: summary.supported,
      label: "Supported",
      cls: "text-ok",
      detail: "Evidence found",
    },
    {
      n: summary.contradicted,
      label: "Contradicted",
      cls: "text-bad",
      detail: "Conflicting evidence",
    },
    {
      n: summary.notVerifiable,
      label: "Not verifiable",
      cls: "text-unk",
      detail: "Insufficient proof",
    },
    {
      n: summary.rejectedQuotes,
      label: "Quotes rejected",
      cls: "text-ink",
      detail: "Failed verification",
    },
  ];

  return (
    <section className="rise space-y-6 sm:space-y-8">
      <StepHeading
        index="04"
        title="What the code supports."
        lede="Every accepted quote below was checked against your files by deterministic code. Claims without verifiable evidence are marked accordingly."
      />

      {demo && (
        <Alert tone="note">
          {sample
            ? "Demo mode: these are pre-written responses for the sample project, run through Handwave's real quote checks. They are not an AI analysis or a real finding."
            : "Demo mode: no AI analysis was run, so nothing was checked. Add a Gemini API key to check real code."}
        </Alert>
      )}

      <section aria-label="Verdict summary">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
            Verification summary
          </h2>
          <span className="text-xs text-muted">
            {verdicts.length}{" "}
            {verdicts.length === 1 ? "claim reviewed" : "claims reviewed"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-w-0 rounded-lg border border-rule bg-card p-3 sm:p-4"
            >
              <dt className="text-xs leading-snug text-muted">{s.label}</dt>
              <dd
                className={cx(
                  "mt-2 font-serif text-3xl tabular-nums sm:text-4xl",
                  s.cls,
                )}
              >
                {s.n}
              </dd>
              <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">
                {s.detail}
              </p>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Claim verdicts" className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
            Claim-by-claim results
          </h2>
          <span className="text-xs text-muted">
            {verdicts.length} total
          </span>
        </div>

        {verdicts.map((v, i) => {
          const claim = byId.get(v.claimId);

          return claim ? (
            <VerdictCard
              key={v.claimId}
              claim={claim}
              v={v}
              index={i}
            />
          ) : null;
        })}

        {verdicts.length === 0 && (
          <div className="rounded-xl border border-dashed border-rule bg-card px-5 py-10 text-center">
            <FileCode2
              aria-hidden
              className="mx-auto size-8 text-muted"
            />
            <p className="mt-3 font-medium text-ink">
              No verdicts to display
            </p>
            <p className="mt-1 text-sm text-muted">
              Go back and check that your claims are ready for review.
            </p>
          </div>
        )}
      </section>

      <details className="group overflow-hidden rounded-xl border border-rule bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-paper-2 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper-2">
              <FileCode2 aria-hidden className="size-4 text-ink-2" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                Your files, now unlocked
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Inspect the source used for verification
              </span>
            </span>
          </span>

          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="space-y-4 border-t border-rule p-3 sm:p-4">
          {files.map((f) => (
            <div
              key={f.name}
              className="overflow-hidden rounded-lg border border-rule"
            >
              <p className="break-all border-b border-rule bg-paper-2 px-3 py-2 font-mono text-xs text-ink-2">
                {f.name}
              </p>
              <div className="max-h-80 overflow-auto">
                <CodeLines
                  text={f.content.replace(/\r\n?/g, "\n").replace(/\n$/, "")}
                  firstLine={1}
                />
              </div>
            </div>
          ))}

          {files.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">
              No source files are available to display.
            </p>
          )}
        </div>
      </details>

      <footer className="flex flex-col-reverse gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back to claims
        </Button>

        <Button variant="primary" onClick={onNext}>
          {summary.contradicted > 0
            ? `Test ${summary.contradicted} ${
                summary.contradicted === 1 ? "finding" : "findings"
              } yourself`
            : "Finish"}
        </Button>
      </footer>
    </section>
  );
}
