import { ArrowLeft, ArrowRight, Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { fixPrompt } from "../data";
import { demoDelay, useSession, type Ruling } from "../state";
import { Button, Notice, PageHead, Stamp, Swoosh, cx, i, type ButtonStatus } from "../ui";

const RULINGS: [Ruling, string][] = [
  ["confirmed", "Confirmed real"],
  ["false_alarm", "False alarm"],
  ["untested", "Couldn't test"],
];

export function Prove() {
  const s = useSession();
  const [copy, setCopy] = useState<Record<string, ButtonStatus | "failed">>({});

  if (!s.verdicts || !s.claims) {
    return (
      <div className="page-inner">
        <PageHead n="05" label="Prove" title="The diagnostic console." lede="Findings to test appear here after the evidence check." />
        <div className="panel empty-state enter" style={i(3)}>
          <p className="h3">Nothing to test yet.</p>
          <p className="muted">Run the evidence check on the Claims page first.</p>
          <Button onClick={() => s.go("claims")}>
            Go to Claims <ArrowRight size={17} aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  const claims = s.claims;
  const findings = s.verdicts.filter((v) => v.verdict !== "SUPPORTED" && v.manualTest.steps.length > 0);
  const ruled = findings.filter((f) => s.rulings[f.claimId]).length;
  const R = 46, C = 2 * Math.PI * R;
  const pct = findings.length ? ruled / findings.length : 0;
  const done = findings.length > 0 && ruled === findings.length;
  const count = (r: Ruling) => findings.filter((f) => s.rulings[f.claimId] === r).length;

  async function doCopy(id: string, text: string) {
    setCopy((c) => ({ ...c, [id]: "loading" }));
    await demoDelay(s, 300);
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopy((c) => ({ ...c, [id]: ok ? "success" : "failed" }));
    window.setTimeout(() => setCopy((c) => ({ ...c, [id]: "idle" })), 2600);
  }

  return (
    <div className="page-inner">
      <PageHead
        n="05"
        label="Prove"
        title="The diagnostic console."
        lede="Run each test in your real app and rule on what you saw. A confirmed finding produces a fix brief built only from your claim, the verified code and your notes."
      />

      <div className="console">
        <aside className="panel console-status enter" style={i(3)}>
          <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={`${ruled} of ${findings.length} findings ruled`}>
            <defs>
              <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFF2D6" />
                <stop offset="0.55" stopColor="#E3C27E" />
                <stop offset="1" stopColor="#8A6A38" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={R} className="ring-track" />
            <circle cx="60" cy="60" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="ring-label">
            <span className="ring-n">
              {ruled}/{findings.length}
            </span>
            <span className="eyebrow">Ruled</span>
          </div>
          <div className="status-copy">
            {done ? (
              <>
                <p className="h4">Investigation closed</p>
                <p className="small muted">
                  {count("confirmed")} confirmed · {count("false_alarm")} false alarm · {count("untested")} untested
                </p>
              </>
            ) : (
              <>
                <p className="h4">{findings.length - ruled} awaiting a ruling</p>
                <p className="small muted">Test in your own app, then record what you observed.</p>
              </>
            )}
          </div>
        </aside>

        <div className="findings">
          {done && (
            <div className="closing enter">
              <Swoosh />
              <Notice tone="success" title="Every finding has a ruling">
                Copy the fix briefs for confirmed findings into your AI app builder. Each brief cites the exact lines.
              </Notice>
            </div>
          )}
          {findings.map((f, fi) => {
            const claim = claims.find((c) => c.id === f.claimId)!;
            const n = claims.indexOf(claim) + 1;
            const r = s.rulings[f.claimId];
            const brief = r === "confirmed" ? fixPrompt(claim, f, s.notes[f.claimId] ?? "") : null;
            const cs = copy[f.claimId] ?? "idle";
            return (
              <article key={f.claimId} className={cx("panel finding enter", r && `is-${r}`)} style={i(fi + 4)}>
                <header className="finding-head">
                  <span className="mono dim">C-{String(n).padStart(2, "0")}</span>
                  <Stamp verdict={f.verdict} />
                  {r && <span className="ruled-mark">{RULINGS.find(([k]) => k === r)![1]}</span>}
                </header>
                <p className="finding-claim">{claim.text}</p>
                <ol className="steps">
                  {f.manualTest.steps.map((st, si) => (
                    <li key={si}>
                      <span className="mono step-n">{String(si + 1).padStart(2, "0")}</span>
                      {st}
                    </li>
                  ))}
                </ol>
                <div className="expected">
                  <p className="eyebrow">Expected if your belief is right</p>
                  <p>{f.manualTest.expected}</p>
                </div>
                <label className="field">
                  <span className="field-label">What you observed</span>
                  <textarea rows={2} value={s.notes[f.claimId] ?? ""} onChange={(e) => s.setNote(f.claimId, e.target.value)} placeholder="Describe what happened when you ran the test." />
                </label>
                <div className="ruling" role="radiogroup" aria-label={`Ruling for C-${n}`}>
                  {RULINGS.map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={r === k} className={cx("rule-btn", `r-${k}`, r === k && "is-on")} onClick={() => s.setRuling(f.claimId, k)}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className={cx("brief-wrap", brief && "is-open")}>
                  <div className="brief">
                    {brief && (
                      <div className="paper-doc">
                        <div className="paper-head">
                          <p className="eyebrow">Fix brief · C-{String(n).padStart(2, "0")}</p>
                          <Button
                            variant="primary"
                            status={cs === "loading" ? "loading" : cs === "success" ? "success" : "idle"}
                            successLabel={`Copied · ${brief.length.toLocaleString()} characters`}
                            onClick={() => void doCopy(f.claimId, brief)}
                          >
                            {cs === "failed" ? (
                              <>
                                <X size={15} aria-hidden /> Clipboard blocked: select the text
                              </>
                            ) : (
                              <>
                                <Copy size={15} aria-hidden /> Copy brief
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="brief-text">{brief}</pre>
                        <p className="paper-foot small">
                          <Check size={13} aria-hidden /> Built from a template. Every fact comes from your claim, the verified quote and your notes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="page-actions">
        <Button variant="ghost" onClick={() => s.go("evidence")}>
          <ArrowLeft aria-hidden size={16} /> Back to evidence
        </Button>
        <Button variant="chrome" onClick={() => s.go("circle")}>
          Stuck? Ask a person <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
