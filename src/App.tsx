import { ApiError, api, type ModeInfo } from "./api";
import { Tagline, VeloraBrand } from "./brand";
import { Compass, Lock, Unlock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FocusButton, FocusPanel } from "./focus/FocusPanel";
import { focus } from "./focus/focusStore";
import { playModeTone } from "./modes/sound";
import type { ConfirmedClaim } from "../shared/types";
import { reverifyVerdicts, summarize } from "../shared/verdictRules";
import { HeroArtwork } from "./artwork/HeroArtwork";
import { HackathonNav, HackathonView, SECTION_MATERIAL } from "./hackathon/HackathonView";
import { ModeSwitch, SoundToggle } from "./modes/ModeSwitch";
import type { MaterialId } from "./artwork/materials";
import { filesDigest } from "./project/digest";
import { useProject } from "./project/store";
import { TOUR, TourCard, TourInvite } from "./tour/Tour";
import type { Mode, Step } from "./project/types";
import { ClaimsStep } from "./steps/ClaimsStep";
import { EvidenceStep } from "./steps/EvidenceStep";
import { ExplainStep } from "./steps/ExplainStep";
import { LoadStep } from "./steps/LoadStep";
import { ProveStep } from "./steps/ProveStep";
import { cx } from "./ui";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Load" },
  { n: 2, label: "Explain" },
  { n: 3, label: "Claims" },
  { n: 4, label: "Evidence" },
  { n: 5, label: "Prove" },
];

/** Each step is finished in its own metal (see materials.css). */
const MATERIAL: Record<Step, MaterialId> = { 1: "obsidian", 2: "burgundy", 3: "silver", 4: "emerald", 5: "champagne" };

function message(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong. Try again.";
}



export default function App() {
  const [mode, setMode] = useState<ModeInfo | null>(null);

  // The project (files, context and every Studio result) lives in the shared in-memory store.
  const { project, dispatch } = useProject();
  const { files, usingSample, context } = project;
  const { step, reached, card, explanation, claims, unexplained, checkedClaims, verdicts, findings } = project.studio;
  const hackathon = project.view.mode === "hackathon";
  // The latest file fingerprint, readable after an await (the render closure would be out of date).
  const currentDigest = useRef(project.filesDigest);
  currentDigest.current = project.filesDigest;

  // Request state belongs to this screen, not to the project.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The guided tour is screen state only: it opens screens, never changes the project.
  const [tour, setTour] = useState<number | null>(null);
  const [invite, setInvite] = useState(true);
  const [focusOpen, setFocusOpen] = useState(false);
  // Set by the first deliberate mode switch, so the content fade never runs on page load.
  const [switched, setSwitched] = useState(false);
  const focusButton = useRef<HTMLDivElement>(null);
  const closeFocus = useCallback(() => {
    setFocusOpen(false);
    focusButton.current?.querySelector("button")?.focus();
  }, []);

  // Focus sessions and active days are recorded against the mode that is open.
  useEffect(() => focus.setMode(project.view.mode), [project.view.mode]);

  useEffect(() => {
    api.status().then(setMode).catch(() => setMode(null));
  }, []);

  // On narrow screens the step bar scrolls sideways; keep the current step visible.
  useEffect(() => {
    document.querySelector('[aria-current="step"], [aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [step, project.view.mode, project.view.section]);

  // The project lives only in memory, so ask before a refresh or close throws it away.
  const hasWork = files.length > 0;
  useEffect(() => {
    if (!hasWork) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasWork]);

  function go(n: Step) {
    setError(null);
    dispatch({ type: "go", step: n });
    window.scrollTo({ top: 0 });
  }

  // Changing inputs invalidates everything downstream of them.
  function resetFrom(n: Step) {
    dispatch({ type: "resetFrom", step: n });
  }

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.extract(explanation, card, context);
      setMode({ mode: r.mode, provider: r.provider, model: r.model });
      dispatch({ type: "setExtraction", claims: r.claims.map((c) => ({ ...c, manual: false, status: "pending" })), unexplained: r.unexplained });
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
    // Fingerprint of exactly the files this check sends, taken before the request starts.
    const sentDigest = filesDigest(files);
    setBusy(true);
    setError(null);
    try {
      const r = await api.check(confirmed, files, context);
      // The files changed while the check ran: its verdicts are for files the project no longer
      // holds, so nothing from this response is used (the store would ignore them too).
      if (sentDigest !== currentDigest.current) return;
      setMode({ mode: r.mode, provider: r.provider, model: r.model });
      // Second, independent check in the browser against the files it holds.
      dispatch({ type: "setCheckResult", checkedClaims: confirmed, verdicts: reverifyVerdicts(r.verdicts, files), filesDigest: sentDigest });
      go(4);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    dispatch({ type: "restart" });
    go(1);
  }

  // Switching modes changes only the view: the project, and Studio's step and progress, stay as they are.
  function switchMode(m: Mode) {
    setError(null);
    setSwitched(true);
    if (m !== project.view.mode && focus.sound()) playModeTone(m);
    dispatch({ type: "setView", view: { mode: m } });
    window.scrollTo({ top: 0 });
  }

  /** From Hackathon back to Studio, optionally at a step that is already reachable. */
  function openStudio(target?: Step) {
    switchMode("studio");
    if (target && target <= reached) go(target);
  }

  function showStop(i: number) {
    const stop = TOUR[i];
    if (!stop) return;
    setTour(i);
    setInvite(false);
    setError(null);
    dispatch({ type: "setView", view: stop.section ? { mode: stop.mode, section: stop.section } : { mode: stop.mode } });
    if (stop.mode === "studio" && stop.step && stop.step <= reached && !busy) dispatch({ type: "go", step: stop.step });
    window.scrollTo({ top: 0 });
  }

  const demo = mode?.mode !== "live";
  // Studio unlocks the code at the Evidence step; Hackathon follows how far Studio has got.
  const unlocked = hackathon ? reached >= 4 : step >= 4;
  const material = hackathon ? SECTION_MATERIAL[project.view.section] : MATERIAL[step];

  return (
    <div className="min-h-dvh" data-material={material}>
      <HeroArtwork material={material} />
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <VeloraBrand mode={project.view.mode} />
            <div className="hidden items-center gap-1 sm:flex">
              <ModeSwitch mode={project.view.mode} onMode={switchMode} />
              <SoundToggle />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div ref={focusButton} className="contents">
              <FocusButton open={focusOpen} onOpen={() => setFocusOpen(true)} />
            </div>
            <button
              onClick={() => showStop(0)}
              aria-label="Guided tour"
              title="Guided tour"
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <Compass aria-hidden className="size-4" />
            </button>
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

      <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14 lg:pt-14">
        <div className="sm:hidden">
          <div className="flex items-center gap-1">
            <ModeSwitch mode={project.view.mode} onMode={switchMode} wide />
            <SoundToggle />
          </div>
          <Tagline mode={project.view.mode} className="mt-2 grid justify-center text-center" />
        </div>
        {tour === null && invite && <TourInvite inline onStart={() => showStop(0)} onDismiss={() => setInvite(false)} />}
        <nav aria-label={hackathon ? "Hackathon sections" : "Steps"} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {hackathon ? (
            <HackathonNav section={project.view.section} onSection={(section) => dispatch({ type: "setView", view: { section } })} />
          ) : (
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
                      <span aria-hidden="true" className={`hw-dot hw-dot-${MATERIAL[s.n]}`} />
                      <span className="font-mono text-[0.7rem] tabular-nums opacity-70">0{s.n}</span>
                      <span className="font-medium">{s.label}</span>
                      {s.n === 3 && <Lock aria-hidden className={cx("ml-auto hidden size-3 lg:block", unlocked && "opacity-0")} />}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-6 hidden max-w-[12rem] text-xs leading-relaxed text-muted lg:block">
            {hackathon
              ? "Same project as Studio: the files, claims and evidence you've already checked. Nothing is uploaded or verified twice."
              : "Explain first, then look. Reading an explanation feels like understanding. Giving one shows where you don't."}
          </p>
        </nav>

        <main key={project.view.mode} className={cx("min-w-0 max-w-[57rem]", switched && "hw-mode-enter")}>
          {hackathon && <HackathonView project={project} mode={mode} onOpenStudio={openStudio} onSection={(section) => dispatch({ type: "setView", view: { section } })} />}
          {!hackathon && step === 1 && (
            <LoadStep
              files={files}
              context={context}
              usingSample={usingSample}
              mode={mode}
              onChange={(f, sample) => dispatch({ type: "setFiles", files: f, usingSample: sample })}
              onContext={(c) => dispatch({ type: "setContext", context: c })}
              onNext={() => go(2)}
            />
          )}
          {!hackathon && step === 2 && (
            <ExplainStep
              files={files}
              card={card}
              explanation={explanation}
              usingSample={usingSample}
              busy={busy}
              error={error}
              onCard={(id) => {
                dispatch({ type: "setCard", card: id });
                if (claims.length) resetFrom(2);
              }}
              onExplanation={(text) => {
                dispatch({ type: "setExplanation", explanation: text });
                if (claims.length) resetFrom(2);
              }}
              onBack={() => go(1)}
              onSubmit={extract}
            />
          )}
          {!hackathon && step === 3 && (
            <ClaimsStep
              explanation={explanation}
              claims={claims}
              unexplained={unexplained}
              demoExtraction={demo && !usingSample}
              busy={busy}
              error={error}
              onClaims={(update) => dispatch({ type: "updateClaims", update })}
              onBack={() => go(2)}
              onSubmit={check}
            />
          )}
          {!hackathon && step === 4 && (
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
          {!hackathon && step === 5 && (
            <ProveStep
              claims={checkedClaims}
              verdicts={verdicts}
              findings={findings}
              demo={demo}
              onFinding={(id, s) => dispatch({ type: "setFinding", claimId: id, finding: s })}
              onBack={() => go(4)}
              onRestart={restart}
            />
          )}
        </main>
      </div>
      <p role="status" className="sr-only">
        {switched ? (hackathon ? "Hackathon mode" : "Studio mode") : ""}
      </p>
      {focusOpen && (
        <FocusPanel
          onClose={closeFocus}
          onPlanner={() => {
            setFocusOpen(false);
            switchMode("hackathon");
            dispatch({ type: "setView", view: { section: "planner" } });
          }}
        />
      )}
      {tour !== null && <TourCard index={tour} onIndex={showStop} onClose={() => setTour(null)} />}
      {tour === null && invite && <TourInvite onStart={() => showStop(0)} onDismiss={() => setInvite(false)} />}
    </div>
  );
}

