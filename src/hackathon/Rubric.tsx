import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useProject } from "../project/store";
import type { RubricCriterion } from "../project/types";
import { Button, cx } from "../ui";
import { newId } from "./analysis/planner";
import { EXAMPLE_RUBRIC, WEAK_AT, evaluateRubric, suggestion } from "./analysis/rubric";
import { FIELD } from "./Planner";
import { Badge, SectionHeading, SectionTitle } from "./parts";

const SCORES = Array.from({ length: 11 }, (_, i) => i);

export function Rubric() {
  const { project, dispatch } = useProject();
  const criteria = project.rubric;
  const update = (fn: (cs: RubricCriterion[]) => RubricCriterion[]) => dispatch({ type: "updateRubric", update: fn });
  const patch = (id: string, p: Partial<RubricCriterion>) => update((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const result = evaluateRubric(criteria);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const w = Number(weight);
    update((cs) => [...cs, { id: newId("r"), name: n, weight: Number.isFinite(w) && w > 0 ? w : 0, score: null }]);
    setName("");
    setWeight("");
  }

  const remaining = Math.round((100 - result.weightTotal) * 10) / 10;

  return (
    <section aria-labelledby="hk-rubric">
      <SectionHeading
        label="Hackathon · Rubric"
        title={<span id="hk-rubric">Score it like a <em>judge</em> might.</span>}
        lede="Enter your hackathon's judging criteria and weights, then score yourself honestly. The result is your own estimate to find weak spots, never an official judge score."
      />

      {criteria.length === 0 ? (
        <div className="mb-8 rounded-xl border border-dashed border-rule-strong px-4 py-6 sm:px-6">
          <p className="text-sm text-ink-2">
            Copy the criteria from your hackathon's rules below. If you don't have them yet, start from a common example and change it to match.
          </p>
          <Button
            className="mt-4"
            onClick={() => update(() => EXAMPLE_RUBRIC.map((c) => ({ id: newId("r"), name: c.name, weight: c.weight, score: null })))}
          >
            Start from an example rubric
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 rounded-xl border border-rule bg-card px-4 py-5 sm:px-6">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">Your estimated score</p>
            {result.overall !== null ? (
              <p className="mt-2 font-serif text-ink">
                <span className="text-[3rem] font-bold leading-none tabular-nums">{result.overall}</span>
                <span className="ml-1 text-lg text-ink-2">/ 100</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-2">
                {!result.weightsValid
                  ? `Weights add up to ${result.weightTotal}%, not 100%. ${remaining > 0 ? `Add ${remaining}% more` : `Remove ${-remaining}%`} to see a total.`
                  : `${result.scored} of ${criteria.length} criteria scored so far: ${result.partial.points} of ${result.partial.of} points.`}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">Self-assessed by you. Not verified by Velora and not an official judge score.</p>
            {result.weak.length > 0 && (
              <p className="mt-3 text-sm text-ink-2">
                <span className="text-highlight">Weak areas: </span>
                {result.weak.map((c) => c.name).join(", ")}.
              </p>
            )}
          </div>

          <SectionTitle aside={<span className={result.weightsValid ? "text-ok" : "text-bad"}>Weights total {result.weightTotal}%</span>}>Criteria</SectionTitle>
          <ol className="space-y-3">
            {criteria.map((c) => {
              const weak = c.score !== null && c.score <= WEAK_AT;
              return (
                <li key={c.id} className={cx("rounded-xl border bg-card px-4 py-4 sm:px-5", weak ? "border-highlight/60" : "border-rule")}>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-[2_1_14rem]">
                      <label htmlFor={`rn-${c.id}`} className="mb-1 block text-xs text-ink-2">
                        Criterion
                      </label>
                      <input id={`rn-${c.id}`} value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} className={cx(FIELD, "w-full")} />
                    </div>
                    <div className="w-24">
                      <label htmlFor={`rw-${c.id}`} className="mb-1 block text-xs text-ink-2">
                        Weight %
                      </label>
                      <input
                        id={`rw-${c.id}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={Number.isFinite(c.weight) ? c.weight : ""}
                        onChange={(e) => patch(c.id, { weight: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                        className={cx(FIELD, "w-full tabular-nums")}
                      />
                    </div>
                    <div className="w-28">
                      <label htmlFor={`rs-${c.id}`} className="mb-1 block text-xs text-ink-2">
                        Your score
                      </label>
                      <select
                        id={`rs-${c.id}`}
                        value={c.score ?? ""}
                        onChange={(e) => patch(c.id, { score: e.target.value === "" ? null : Number(e.target.value) })}
                        className={cx(FIELD, "w-full")}
                      >
                        <option value="">Not scored</option>
                        {SCORES.map((s) => (
                          <option key={s} value={s}>
                            {s} / 10
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => update((cs) => cs.filter((x) => x.id !== c.id))}
                      aria-label={`Remove ${c.name || "criterion"}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-bad"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                    {result.points[c.id] !== null && (
                      <span className="tabular-nums">
                        {result.points[c.id]} of {c.weight} weighted points
                      </span>
                    )}
                    {weak && <Badge tone="text-highlight">Weak area</Badge>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    <span className="text-ink">To strengthen: </span>
                    {suggestion(c, project)}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-rule bg-card px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-[2_1_14rem]">
          <label htmlFor="rb-name" className="mb-1 block text-xs text-ink-2">
            New criterion
          </label>
          <input id="rb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Technical complexity" className={cx(FIELD, "w-full")} />
        </div>
        <div className="w-24">
          <label htmlFor="rb-weight" className="mb-1 block text-xs text-ink-2">
            Weight %
          </label>
          <input id="rb-weight" type="number" inputMode="decimal" min={0} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} className={cx(FIELD, "w-full")} />
        </div>
        <Button type="submit" disabled={!name.trim()}>
          <Plus aria-hidden className="size-4" />
          Add criterion
        </Button>
      </form>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        Edits are kept as you type, in memory with the rest of the project; refreshing or closing Velora discards them. The Report section includes
        your rubric in the Markdown download. Suggestions use only what Velora has: verified claims from Studio, your checklist and your plan.
      </p>
    </section>
  );
}
