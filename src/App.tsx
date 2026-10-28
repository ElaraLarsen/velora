import { Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import type { CheckedVerdict, ConfirmedClaim, SourceFile } from "../shared/types";
import { reverifyVerdicts, summarize } from "../shared/verdictRules";
import { ApiError, api, type ModeInfo } from "./api";
import { ClaimsStep, type DraftClaim } from "./steps/ClaimsStep";
import { EvidenceStep } from "./steps/EvidenceStep";
import { ExplainStep } from "./steps/ExplainStep";
import { LoadStep } from "./steps/LoadStep";
import { ProveStep, type FindingState } from "./steps/ProveStep";
import { cx } from "./ui";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Load" },
  { n: 2, label: "Explain" },
  { n: 3, label: "Claims" },
  { n: 4, label: "Evidence" },
  { n: 5, label: "Prove" },
];

/** Each step is finished in its own metal (see materials.css). */
const MATERIAL: Record<Step, string> = { 1: "obsidian", 2: "burgundy", 3: "silver", 4: "emerald", 5: "champagne" };

function message(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong. Try again.";
}

function Wordmark() {
  return (
    <span className="inline-flex flex-col leading-none">
      <span className="font-serif text-[1.55rem] italic tracking-[-0.01em]">Handwave</span>
      <svg aria-hidden viewBox="0 0 120 8" className="-mt-0.5 h-2 w-[6.2rem] text-marker">
        <path d="M2 5c8-6 14-6 20 0s12 6 20 0 12-6 20 0 12 6 20 0 12-6 20 0 10 5 16 1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function App() {
  const [mode, setMode] = useState<ModeInfo | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [reached, setReached] = useState<Step>(1);

  const [files, setFiles] = useState<SourceFile[]>([]);
  const [usingSample, setUsingSample] = useState(false);
  const [context, setContext] = useState("");

  const [card, setCard] = useState("data-access");
  const [explanation, setExplanation] = useState("");

  const [claims, setClaims] = useState<DraftClaim[]>([]);
  const [unexplained, setUnexplained] = useState<{ phrase: string; question: string }[]>([]);
  const [checkedClaims, setCheckedClaims] = useState<ConfirmedClaim[]>([]);
  const [verdicts, setVerdicts] = useState<CheckedVerdict[]>([]);
  const [findings, setFindings] = useState<Record<string, FindingState>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.status().then(setMode).catch(() => setMode(null));
  }, []);

  // On narrow screens the step bar scrolls sideways; keep the current step visible.
  useEffect(() => {
    document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [step]);

  function go(n: Step) {
    setError(null);
    setStep(n);
    setReached((r) => (n > r ? n : r));
    window.scrollTo({ top: 0 });
  }

  // Changing inputs invalidates everything downstream of them.
  function resetFrom(n: Step) {
    if (n <= 3) {
      setClaims([]);
      setUnexplained([]);
    }
    setCheckedClaims([]);
    setVerdicts([]);
    setFindings({});
    setReached((r) => (r > n ? n : r));
  }

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.extract(explanation, card, context);
      setMode({ mode: r.mode, provider: r.provider, model: r.model });
      setClaims(r.claims.map((c) => ({ ...c, manual: false, status: "pending" })));
      setUnexplained(r.unexplained);
      resetFrom(4);
      go(3);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    const confirmed: ConfirmedClaim[] = claims
      .filter((c) => c.status === "confirmed" && c.text.trim().length >= 3)
      .map((c) => ({ id: c.id, text: c.text.trim(), category: c.category }));
    setBusy(true);
    setError(null);
    try {
      const r = await api.check(confirmed, files, context);
      setMode({ mode: r.mode, provider: r.provider, model: r.model });
      setCheckedClaims(confirmed);
      // Second, independent check in the browser against the files it holds.
      setVerdicts(reverifyVerdicts(r.verdicts, files));
      setFindings({});
      go(4);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setFiles([]);
    setUsingSample(false);
    setContext("");
    setExplanation("");
    resetFrom(1);
    setReached(1);
    go(1);
  }

  const demo = mode?.mode !== "live";
  const unlocked = step >= 4;

  return (
    <div className="min-h-dvh" data-material={MATERIAL[step]}>
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted sm:inline-flex">
              {unlocked ? <Unlock aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}
              {unlocked ? "Code unlocked" : "Code locked"}
            </span>
            {mode && (
              <span
                className={cx("stamp", demo ? "border-dashed text-ink-2" : "text-ok")}
                title={demo ? "No AI provider is configured. Responses are deterministic samples." : `${mode.provider} · ${mode.model}`}
              >
                {demo ? "Demo mode" : `Live · ${mode.model}`}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14 lg:pt-14">
        <nav aria-label="Steps" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
            {STEPS.map((s) => {
              const current = s.n === step;
              const available = s.n <= reached && !busy;
              return (
                <li key={s.n} className="shrink-0">
                  <button
                    disabled={!available}
                    onClick={() => go(s.n)}
                    aria-current={current ? "step" : undefined}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      current ? "bg-ink text-paper" : available ? "text-ink hover:bg-paper-2" : "text-muted",
                    )}
                  >
                    <span className="font-mono text-[0.7rem] tabular-nums opacity-70">0{s.n}</span>
                    <span className="font-medium">{s.label}</span>
                    {s.n === 3 && <Lock aria-hidden className={cx("ml-auto hidden size-3 lg:block", unlocked && "opacity-0")} />}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 hidden max-w-[12rem] text-xs leading-relaxed text-muted lg:block">
            Explain first, then look. Reading an explanation feels like understanding. Giving one shows where you don't.
          </p>
        </nav>

        <main className="min-w-0 max-w-[57rem]">
          {step === 1 && (
            <LoadStep
              files={files}
              context={context}
              usingSample={usingSample}
              mode={mode}
              onChange={(f, sample) => {
                setFiles(f);
                setUsingSample(sample);
                resetFrom(2);
              }}
              onContext={setContext}
              onNext={() => go(2)}
            />
          )}
          {step === 2 && (
            <ExplainStep
              files={files}
              card={card}
              explanation={explanation}
              usingSample={usingSample}
              busy={busy}
              error={error}
              onCard={(id) => {
                setCard(id);
                if (claims.length) resetFrom(2);
              }}
              onExplanation={(text) => {
                setExplanation(text);
                if (claims.length) resetFrom(2);
              }}
              onBack={() => go(1)}
              onSubmit={extract}
            />
          )}
          {step === 3 && (
            <ClaimsStep
              explanation={explanation}
              claims={claims}
              unexplained={unexplained}
              demoExtraction={demo && !usingSample}
              busy={busy}
              error={error}
              onClaims={setClaims}
              onBack={() => go(2)}
              onSubmit={check}
            />
          )}
          {step === 4 && (
            <EvidenceStep
              claims={checkedClaims}
              verdicts={verdicts}
              summary={summarize(verdicts)}
              files={files}
              demo={demo}
              sample={usingSample}
              onBack={() => go(3)}
              onNext={() => go(5)}
            />
          )}
          {step === 5 && (
            <ProveStep
              claims={checkedClaims}
              verdicts={verdicts}
              findings={findings}
              demo={demo}
              onFinding={(id, s) => setFindings((f) => ({ ...f, [id]: s }))}
              onBack={() => go(4)}
              onRestart={restart}
            />
          )}
        </main>
      </div>
    </div>
  );
}
