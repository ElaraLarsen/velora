import {
  AlertTriangle,
  Check,
  CircleHelp,
  Lock,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { segmentHedges } from "../../shared/hedges";
import { CATEGORIES } from "../../shared/schemas";
import type { ClaimCategory } from "../../shared/types";
import {
  Alert,
  Button,
  Eyebrow,
  Spinner,
  StepHeading,
  cx,
} from "../ui";

export interface DraftClaim {
  id: string;
  text: string;
  sourceSpan: string;
  category: ClaimCategory;
  traceable: boolean;
  manual: boolean;
  status: "pending" | "confirmed" | "deleted";
}

interface Props {
  explanation: string;
  claims: DraftClaim[];
  unexplained: { phrase: string; question: string }[];
  demoExtraction: boolean;
  busy: boolean;
  error: string | null;
  onClaims: (update: (claims: DraftClaim[]) => DraftClaim[]) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const CATEGORY_LABEL: Record<ClaimCategory, string> = {
  data: "Data",
  access: "Access",
  failure: "Failure",
  cost: "Cost",
  secrets: "Secrets",
  behavior: "Behaviour",
};

export function ClaimsStep({
  explanation,
  claims,
  unexplained,
  demoExtraction,
  busy,
  error,
  onClaims,
  onBack,
  onSubmit,
}: Props) {
  const confirmed = claims.filter(
    (c) => c.status === "confirmed" && c.text.trim().length >= 3,
  );
  const pending = claims.filter((c) => c.status === "pending");
  const deleted = claims.filter((c) => c.status === "deleted");

  function update(id: string, patch: Partial<DraftClaim>) {
    onClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function addClaim() {
    onClaims((prev) => {
      const n =
        prev.reduce(
          (max, c) =>
            Math.max(max, Number(c.id.replace(/\D/g, "")) || 0),
          0,
        ) + 1;

      return [
        ...prev,
        {
          id: `c${n}`,
          text: "",
          sourceSpan: "",
          category: "behavior",
          traceable: true,
          manual: true,
          status: "pending",
        },
      ];
    });
  }

  return (
    <section className="rise">
      <StepHeading
        index="03"
        title={
          <>
            Are these the things <em className="italic">you believe?</em>
          </>
        }
        lede="Review each claim before checking the code. Edit anything that misses your meaning, remove claims you don't agree with, and confirm only what you genuinely believe."
      />

      <div className="rounded-xl border border-rule bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Your original explanation</Eyebrow>
          <span className="font-mono text-[0.68rem] text-muted">
            {explanation.trim()
              ? explanation.trim().split(/\s+/).length
              : 0}{" "}
            words
          </span>
        </div>

        <p className="mt-3 whitespace-pre-wrap font-serif text-base leading-8 text-ink">
          {segmentHedges(explanation).map((s, i) =>
            s.hedge ? (
              <mark key={i} className="marker">
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </p>

        <p className="mt-4 border-t border-rule pt-3 text-xs leading-5 text-muted">
          Highlighted words come from a fixed list of hedges. They can point to
          uncertainty, but they don't automatically mean a claim is wrong.
        </p>
      </div>

      {unexplained.length > 0 && (
        <div className="mt-4 rounded-xl border border-rule bg-paper-2/60 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CircleHelp
              aria-hidden
              className="size-4 shrink-0 text-ink-2"
            />
            <Eyebrow>Things to revisit</Eyebrow>
          </div>
          <ul className="mt-3 space-y-3">
            {unexplained.map((u, i) => (
              <li key={i} className="text-sm leading-6">
                <span className="marker">{u.phrase}</span>
                <p className="mt-1 text-ink-2">{u.question}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {demoExtraction && (
        <div className="mt-4">
          <Alert tone="note">
            Demo mode: claims were split from your sentences using simple
            rules, not AI. Review them carefully.
          </Alert>
        </div>
      )}

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Review and confirm</Eyebrow>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">
              Your claims
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-ok/30 bg-ok-bg px-2.5 py-1 text-ok">
              {confirmed.length} confirmed
            </span>
            <span className="rounded-full border border-rule bg-card px-2.5 py-1 text-ink-2">
              {pending.length} to review
            </span>
            {deleted.length > 0 && (
              <span className="rounded-full border border-rule bg-paper-2 px-2.5 py-1 text-muted">
                {deleted.length} removed
              </span>
            )}
          </div>
        </div>

        {claims.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-rule-strong bg-card px-5 py-8 text-center">
            <p className="font-serif text-xl">Nothing to check yet.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-2">
              Go back and add more detail to your explanation, or create a
              claim manually below.
            </p>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {claims.map((c, i) => {
              const isDeleted = c.status === "deleted";
              const isConfirmed = c.status === "confirmed";

              return (
                <li
                  key={c.id}
                  className={cx(
                    "overflow-hidden rounded-xl border bg-card transition-colors",
                    isDeleted
                      ? "border-rule opacity-65"
                      : isConfirmed
                        ? "border-ok/45"
                        : "border-rule-strong",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
                    <span className="font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                      Claim {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="flex items-center gap-2">
                      {isConfirmed && (
                        <span className="stamp inline-flex items-center gap-1 text-ok">
                          <Check aria-hidden className="size-3" />
                          Confirmed
                        </span>
                      )}
                      {isDeleted && (
                        <span className="stamp text-muted">Removed</span>
                      )}
                      {!isConfirmed && !isDeleted && (
                        <span className="stamp text-ink-2">Pending</span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-4 sm:px-5">
                    <label
                      className="mb-2 block text-xs text-muted"
                      htmlFor={`cat-${c.id}`}
                    >
                      Claim category
                    </label>
                    <select
                      id={`cat-${c.id}`}
                      value={c.category}
                      disabled={isDeleted}
                      onChange={(e) =>
                        update(c.id, {
                          category: e.target.value as ClaimCategory,
                        })
                      }
                      className="mb-3 max-w-full rounded-lg border border-rule bg-paper-2 px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABEL[cat]}
                        </option>
                      ))}
                    </select>

                    <label className="sr-only" htmlFor={`claim-${c.id}`}>
                      Claim {i + 1} text
                    </label>
                    <textarea
                      id={`claim-${c.id}`}
                      value={c.text}
                      disabled={isDeleted}
                      rows={2}
                      maxLength={400}
                      placeholder="Write a claim you believe about this feature"
                      onChange={(e) =>
                        update(c.id, {
                          text: e.target.value,
                          status: "pending",
                        })
                      }
                      className={cx(
                        "block w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-2 font-serif text-lg leading-relaxed text-ink placeholder:text-muted focus:border-rule-strong focus:outline-none",
                        isDeleted && "line-through",
                      )}
                    />

                    {!c.manual && c.sourceSpan && (
                      <div className="mt-3 rounded-lg bg-paper-2/70 px-3 py-2.5">
                        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
                          From your explanation
                        </p>
                        <p className="mt-1 font-serif text-sm italic leading-6 text-ink-2">
                          “{c.sourceSpan}”
                        </p>
                      </div>
                    )}

                    {!c.traceable && (
                      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-bad">
                        <AlertTriangle
                          aria-hidden
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        This claim doesn't match a span in your explanation.
                        The AI may have added it, so review it carefully.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-paper-2/40 px-3 py-2">
                    <div className="text-xs text-muted">
                      {isDeleted
                        ? "This claim won't be checked."
                        : isConfirmed
                          ? "Included in the code check."
                          : "Needs your confirmation."}
                    </div>

                    <div className="flex items-center gap-1">
                      {isDeleted ? (
                        <Button
                          variant="ghost"
                          onClick={() => update(c.id, { status: "pending" })}
                        >
                          <Undo2 aria-hidden className="size-4" />
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="danger"
                            onClick={() =>
                              update(c.id, { status: "deleted" })
                            }
                          >
                            <Trash2 aria-hidden className="size-4" />
                            Remove
                          </Button>
                          <Button
                            variant={isConfirmed ? "ghost" : "secondary"}
                            disabled={c.text.trim().length < 3}
                            onClick={() =>
                              update(c.id, {
                                status: isConfirmed
                                  ? "pending"
                                  : "confirmed",
                              })
                            }
                            aria-pressed={isConfirmed}
                          >
                            <Check aria-hidden className="size-4" />
                            {isConfirmed ? "Unconfirm" : "Confirm"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <Button
          variant="secondary"
          className="mt-4"
          onClick={addClaim}
          disabled={claims.length >= 15 || busy}
        >
          <Plus aria-hidden className="size-4" />
          Add a claim
        </Button>
        {claims.length >= 15 && (
          <p className="mt-2 text-xs text-muted">
            You've reached the limit of 15 claims.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-rule bg-paper-2/60 p-4 sm:p-5">
        <p className="text-sm font-medium text-ink">Before checking the code</p>
        <p className="mt-1 text-sm leading-6 text-ink-2">
          Only confirmed claims with at least three characters will be sent
          for checking. Editing a confirmed claim returns it to pending.
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          ← Back
        </Button>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {pending.length > 0 && !busy && (
            <p className="text-right text-xs text-muted">
              {pending.length} pending{" "}
              {pending.length === 1 ? "claim won't" : "claims won't"} be checked.
            </p>
          )}

          {busy ? (
            <Spinner label="Checking your claims against the code…" />
          ) : (
            <Button
              variant="primary"
              disabled={confirmed.length === 0}
              onClick={onSubmit}
            >
              <Lock aria-hidden className="size-4" />
              Check {confirmed.length}{" "}
              {confirmed.length === 1 ? "claim" : "claims"}
              <span aria-hidden>→</span>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
