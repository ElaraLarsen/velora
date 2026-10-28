import { ArrowLeft, ArrowRight, Check, Lock, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SAMPLE_EXPLANATION } from "../../shared/sample";
import { CLAIMS, PROMISE_CARDS, countLines, findHedges, segmentHedges } from "../data";
import { demoDelay, useSession } from "../state";
import { Button, DemoTag, Notice, PageHead, cx, i } from "../ui";

const GUIDE_SECONDS = 90;
const MIN_CHARS = 20; // same rule as the app: the submit button needs at least 20 characters

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

export function Explain() {
  const s = useSession();
  const selected = PROMISE_CARDS.find((c) => c.id === s.card);
  const elapsed = useElapsed(s.explanation.length > 0);
  const words = s.explanation.trim() ? s.explanation.trim().split(/\s+/).length : 0;
  const hedges = findHedges(s.explanation).length;
  const [busy, setBusy] = useState(false);
  const mirror = useRef<HTMLDivElement>(null);
  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const lines = s.files.reduce((n, f) => n + countLines(f.content), 0);

  async function submit() {
    setBusy(true);
    await demoDelay(s, 1600);
    s.setClaims(CLAIMS);
    setBusy(false);
    s.go("claims");
  }

  return (
    <div className="page-inner">
      <PageHead
        n="02"
        label="Explain"
        title={
          <>
            Explain it <em>out loud.</em>
          </>
        }
        lede="Choose a question and explain the feature in your own words. Use Wispr Flow if you like, or type. Don't open the code first: say what you're sure of and where it gets fuzzy."
      />

      <fieldset className="questions enter" style={i(3)}>
        <legend className="field-label">Which question are you answering?</legend>
        <div className="question-grid">
          {PROMISE_CARDS.map((c, k) => {
            const on = c.id === s.card;
            return (
              <label key={c.id} className={cx("question", on && "is-on")}>
                <input type="radio" name="card" value={c.id} checked={on} onChange={() => s.setCard(c.id)} className="sr-only" />
                <span className="row between">
                  <span className="mono dim">Q{String(k + 1).padStart(2, "0")}</span>
                  <span className="q-check" aria-hidden>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </span>
                <span className="q-title">{c.title}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="explain-grid">
        <div className="panel lacquer-card enter" style={i(4)}>
          {selected ? (
            <>
              <p className="eyebrow">Your prompt</p>
              <p className="prompt">{selected.question}</p>
              <p className="muted">{selected.hint}</p>
            </>
          ) : (
            <>
              <p className="eyebrow">No question chosen</p>
              <p className="prompt muted-prompt">Pick one of the five questions above to begin.</p>
            </>
          )}
          <div className="sealed-note">
            <Lock size={15} aria-hidden />
            <span>
              {s.files.length} files · {lines.toLocaleString()} lines sealed. Your explanation becomes claims before any code is examined.
            </span>
          </div>
        </div>

        <div className="panel deposition enter" style={i(5)}>
          <div className="deposition-head">
            <span className="row gap-s">
              <Mic size={16} aria-hidden /> <span className="field-label">Your explanation</span>
            </span>
            <span className={cx("timer mono", elapsed > GUIDE_SECONDS && "is-over")} aria-label="Elapsed time and suggested duration">
              {mm} / 1:30
            </span>
          </div>
          <div className="hedge-field">
            <div className="hedge-mirror" ref={mirror} aria-hidden>
              {segmentHedges(s.explanation).map((seg, k) => (seg.hedge ? <mark key={k}>{seg.text}</mark> : <span key={k}>{seg.text}</span>))}
              {"\n"}
            </div>
            <label htmlFor="explanation" className="sr-only">
              Your explanation
            </label>
            <textarea
              id="explanation"
              value={s.explanation}
              onChange={(e) => s.setExplanation(e.target.value)}
              onScroll={(e) => {
                if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop;
              }}
              maxLength={6000}
              placeholder="When someone presses save, I think the app first…"
            />
          </div>
          <div className="deposition-foot">
            <span className="mono small">
              <strong>{words}</strong> words · <strong className={cx(hedges > 0 && "hl")}>{hedges}</strong> hedge words · {s.explanation.length}/6000
            </span>
            {s.explanation.trim() !== SAMPLE_EXPLANATION && (
              <Button variant="ghost" onClick={() => s.setExplanation(SAMPLE_EXPLANATION)}>
                Insert sample explanation
              </Button>
            )}
          </div>
        </div>
      </div>

      {hedges > 0 && (
        <div className="enter">
          <Notice tone="info" title={`${hedges} hedge ${hedges === 1 ? "word" : "words"} marked`}>
            Hedges like “I think” show where your understanding gets fuzzy. They stay marked through to the verdicts, so uncertainty is never hidden.
          </Notice>
        </div>
      )}

      <div className="page-actions">
        <Button variant="ghost" onClick={() => s.go("load")} disabled={busy}>
          <ArrowLeft aria-hidden size={16} /> Back
        </Button>
        <span className="row gap wrap end">
          {busy && <DemoTag>Prototype returns the sample's claims</DemoTag>}
          <Button disabled={s.explanation.trim().length < MIN_CHARS || !selected} status={busy ? "loading" : "idle"} onClick={() => void submit()}>
            {busy ? "Finding claims…" : "Turn this into claims"} <ArrowRight aria-hidden size={17} />
          </Button>
        </span>
      </div>
    </div>
  );
}
