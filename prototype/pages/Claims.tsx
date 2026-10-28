import { ArrowLeft, ArrowRight, Check, ChevronDown, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { UNEXPLAINED, checkClaims, segmentHedges } from "../data";
import { demoDelay, useSession, type StageState } from "../state";
import { Button, Capsule, DemoTag, Notice, PageHead, cx, i } from "../ui";

const STAGES = ["Seal the confirmed claims", "Get model verdicts (canned sample output, no network)", "Locate every quote in the source files", "Apply the verdict rules"];

export function Claims() {
  const s = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [stages, setStages] = useState<StageState[]>(["idle", "idle", "idle", "idle"]);
  const [results, setResults] = useState<string[]>(["", "", "", ""]);
  const [failNext, setFailNext] = useState(false);
  const [error, setError] = useState(false);
  const running = stages.includes("running");

  if (!s.claims) {
    return (
      <div className="page-inner">
        <PageHead n="03" label="Claims" title="Your words, on the record." lede="Claims appear here once you've explained the feature." />
        <div className="panel empty-state enter" style={i(3)}>
          <p className="h3">No claims yet.</p>
          <p className="muted">Explain the feature first. Handwave reads your explanation for claims before it opens any code.</p>
          <Button onClick={() => s.go("explain")}>
            Go to Explain <ArrowRight size={17} aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  const claims = s.claims;

  async function run() {
    setError(false);
    const confirmed = claims.filter((c) => s.confirmed.has(c.id));
    const v = checkClaims(confirmed);
    const quotes = v.reduce((n, x) => n + x.evidence.length + x.rejectedQuotes.length, 0);
    const verified = v.reduce((n, x) => n + x.evidence.length, 0);
    const res = [`${confirmed.length} claims`, `${v.length} verdicts`, `${verified} of ${quotes} verified`, `${v.filter((x) => x.downgradeReason).length} downgraded`];
    setResults(res);
    const seq: StageState[] = ["idle", "idle", "idle", "idle"];
    for (let k = 0; k < 4; k++) {
      seq[k] = "running";
      setStages([...seq]);
      await demoDelay(s, 650);
      if (k === 1 && failNext) {
        seq[k] = "failed";
        setStages([...seq]);
        setFailNext(false);
        setError(true);
        return;
      }
      seq[k] = "done";
      setStages([...seq]);
    }
    s.setVerdicts(v);
    s.setSelected(v.find((x) => x.verdict === "CONTRADICTED")?.claimId ?? v[0]?.claimId ?? "");
    await demoDelay(s, 450);
    s.go("evidence");
  }

  function saveEdit(id: string) {
    s.setClaims(claims.map((c) => (c.id === id ? { ...c, text: draft.trim() || c.text } : c)));
    setEditing(null);
  }

  return (
    <div className="page-inner">
      <PageHead
        n="03"
        label="Claims"
        title={
          <>
            Your words, <em>on the record.</em>
          </>
        }
        lede="Confirm the claims that match what you meant. Edit any that are off. Only confirmed claims are checked against the code."
        aside={<DemoTag>Sample claims</DemoTag>}
      />

      <div className="claims-layout">
        <div className="panel claim-panel enter" style={i(3)}>
          <div className="claim-panel-head">
            <span className="eyebrow">Extracted claims</span>
            <span className="mono small">
              {s.confirmed.size} of {claims.length} confirmed
            </span>
          </div>
          <ol className="claim-list">
            {claims.map((c, k) => {
              const on = s.confirmed.has(c.id);
              const isOpen = open === c.id;
              return (
                <li key={c.id} className={cx("claim", on && "is-on", isOpen && "is-open")}>
                  <div className="claim-row">
                    <span className="claim-n mono">C-{String(k + 1).padStart(2, "0")}</span>
                    <div className="claim-main">
                      {editing === c.id ? (
                        <div className="claim-edit">
                          <label className="sr-only" htmlFor={`edit-${c.id}`}>
                            Edit claim C-{k + 1}
                          </label>
                          <textarea id={`edit-${c.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
                          <div className="row gap">
                            <Button variant="chrome" onClick={() => saveEdit(c.id)}>
                              Save
                            </Button>
                            <Button variant="ghost" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="claim-text" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                          {c.text}
                          <ChevronDown size={16} aria-hidden className="chev" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className={cx("toggle", on && "is-on")}
                      aria-pressed={on}
                      aria-label={`${on ? "Unconfirm" : "Confirm"} claim C-${k + 1}`}
                      onClick={() => s.toggleConfirmed(c.id)}
                      disabled={running}
                    >
                      <span className="toggle-knob">{on && <Check size={12} strokeWidth={3} />}</span>
                    </button>
                  </div>
                  <div className="claim-detail" hidden={!isOpen}>
                    <p className="small muted">From your words</p>
                    <blockquote className="source-span">
                      {segmentHedges(c.sourceSpan).map((seg, j) => (seg.hedge ? <mark key={j}>{seg.text}</mark> : <span key={j}>{seg.text}</span>))}
                    </blockquote>
                    <div className="row gap wrap">
                      <Capsule>{c.category}</Capsule>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(c.id);
                          setDraft(c.text);
                          setOpen(null);
                        }}
                      >
                        <Pencil size={14} aria-hidden /> Edit wording
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="claims-side">
          {UNEXPLAINED.map((u) => (
            <div key={u.phrase} className="panel probe enter" style={i(4)}>
              <p className="eyebrow">Left unexplained</p>
              <p className="probe-quote">“{u.phrase}”</p>
              <p className="muted">{u.question}</p>
            </div>
          ))}

          <div className="panel diag-panel enter" style={i(5)}>
            <p className="eyebrow">Evidence check</p>
            <ol className="diag" aria-live="polite">
              {STAGES.map((l, k) => (
                <li key={l} className={cx("diag-row", `is-${stages[k]}`)}>
                  <span className="diag-dot" aria-hidden />
                  <span>{l}</span>
                  <span className="mono small diag-result">{stages[k] === "done" ? results[k] : stages[k] === "failed" ? "failed" : stages[k] === "running" ? "…" : ""}</span>
                  <span className="diag-bar" aria-hidden>
                    <span />
                  </span>
                </li>
              ))}
            </ol>
            {error && (
              <Notice
                tone="error"
                title="The AI provider didn't respond"
                action={
                  <Button variant="chrome" onClick={() => void run()}>
                    <RotateCcw size={15} aria-hidden /> Try again
                  </Button>
                }
              >
                Simulated in the prototype. Nothing was sent. Your claims are kept.
              </Notice>
            )}
            <Button status={running ? "loading" : "idle"} disabled={s.confirmed.size === 0} onClick={() => void run()} className="full">
              {running ? "Checking…" : s.verdicts ? "Check again" : "Check against the code"} <ArrowRight size={17} aria-hidden />
            </Button>
            <label className="check">
              <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} disabled={running} /> Simulate a provider error on the next check
            </label>
          </div>
        </aside>
      </div>

      <div className="page-actions">
        <Button variant="ghost" onClick={() => s.go("explain")}>
          <ArrowLeft aria-hidden size={16} /> Back
        </Button>
        <span className="small muted">Quote checks and line numbers come from Handwave's real verifier.</span>
      </div>
    </div>
  );
}
