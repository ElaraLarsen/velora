import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { QuoteCheck } from "../../shared/types";
import { fileLines, summarize } from "../data";
import { useSession } from "../state";
import { Button, Notice, PageHead, Stamp, VERDICT, cx, i } from "../ui";

const REJECT_REASON: Record<string, string> = {
  not_found: "Not found in the cited file",
  wrong_file: "Found, but in a different file",
  too_short: "Too short to verify (under 12 characters)",
};

function Exhibit({ q, label }: { q: QuoteCheck; label: string }) {
  const [whole, setWhole] = useState(false);
  const loc = q.location!;
  const all = fileLines(loc.file);
  const from = whole ? 1 : Math.max(1, loc.lineStart - 2);
  const to = whole ? all.length : Math.min(all.length, loc.lineEnd + 2);
  const others = q.occurrences.filter((o) => o.lineStart !== loc.lineStart);
  return (
    <figure className="exhibit">
      <figcaption className="exhibit-head brushed">
        <span className="exhibit-tab mono">{label}</span>
        <span className="mono path" title={loc.file}>
          {loc.file}
        </span>
        <span className="mono accent">
          L{loc.lineStart}
          {loc.lineEnd !== loc.lineStart && `–${loc.lineEnd}`}
        </span>
        <span className="mono dim">{q.match === "exact" ? "exact match" : "whitespace match"}</span>
        {others.map((o) => (
          <span key={o.lineStart} className="chip mono">
            also at L{o.lineStart}
          </span>
        ))}
      </figcaption>
      <pre className="code" tabIndex={0} aria-label={`Source lines ${from} to ${to} of ${loc.file}`}>
        <code>
          {all.slice(from - 1, to).map((text, k) => {
            const n = from + k;
            const hit = n >= loc.lineStart && n <= loc.lineEnd;
            return (
              <span key={n} className={cx("code-line", hit && "is-hit")} style={{ "--k": n - loc.lineStart } as CSSProperties}>
                <span className="ln">{n}</span>
                <span className="lc">{text || " "}</span>
              </span>
            );
          })}
        </code>
      </pre>
      <button type="button" className="exhibit-more" aria-expanded={whole} onClick={() => setWhole((w) => !w)}>
        {whole ? "Show only the quoted lines" : `Show the whole file (${all.length} lines)`}
      </button>
    </figure>
  );
}

export function Evidence() {
  const s = useSession();
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<string | null>(null);

  const measure = useCallback(() => {
    const w = wrap.current, d = detailRef.current, row = listRef.current?.querySelector<HTMLElement>(".ev-row.is-sel");
    if (!w || !d || !row || window.innerWidth < 1100) return setPath(null);
    const W = w.getBoundingClientRect(), R = row.getBoundingClientRect(), D = d.getBoundingClientRect();
    const x1 = R.right - W.left, y1 = R.top + R.height / 2 - W.top;
    const x2 = D.left - W.left, y2 = D.top + 48 - W.top;
    const mx = (x1 + x2) / 2;
    setPath(`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [measure, s.selected, s.verdicts]);

  if (!s.verdicts || !s.claims) {
    return (
      <div className="page-inner">
        <PageHead n="04" label="Evidence" title="The exhibit room." lede="Every quote shown here is cut from your source files, with locations computed in code." />
        <div className="panel empty-state enter" style={i(3)}>
          <Lock size={22} aria-hidden />
          <p className="h3">The room is dark until claims are checked.</p>
          <p className="muted">Confirm claims and run the evidence check first.</p>
          <Button onClick={() => s.go("claims")}>
            Go to Claims <ArrowRight size={17} aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  const claims = s.claims;
  const sum = summarize(s.verdicts);
  const sel = s.verdicts.find((v) => v.claimId === s.selected) ?? s.verdicts[0]!;
  const claim = claims.find((c) => c.id === sel.claimId)!;
  const idx = claims.indexOf(claim) + 1;
  const segs: [number, string, string][] = [
    [sum.contradicted, "v-bad", "contradicted"],
    [sum.supported, "v-ok", "supported"],
    [sum.notVerifiable, "v-unk", "not verifiable"],
  ];

  return (
    <div className="page-inner">
      <PageHead
        n="04"
        label="Evidence"
        title="The exhibit room."
        lede="Each verdict stands on exhibits cut from your files. Quotes the AI cited but that can't be found are ruled inadmissible, and verdicts without evidence are downgraded."
        aside={
          <div className="tally">
            <div className="tally-bar" aria-hidden>
              {segs.map(([n, cls], k) => (
                <span key={k} className={cls} style={{ flexGrow: n, "--i": k } as CSSProperties} />
              ))}
            </div>
            <p className="tally-legend mono small">
              {segs.map(([n, cls, l]) => (
                <span key={l} className={cls}>
                  {n} {l}
                </span>
              ))}
              <span className="dim">{sum.rejectedQuotes} inadmissible</span>
            </p>
          </div>
        }
      />

      <div className="evidence-grid" ref={wrap}>
        {path && (
          <svg className="thread" aria-hidden>
            <path key={sel.claimId} d={path} />
          </svg>
        )}
        <ol className="ev-list enter" style={i(3)} ref={listRef} aria-label="Checked claims">
          {s.verdicts.map((v) => {
            const c = claims.find((x) => x.id === v.claimId)!;
            const n = claims.indexOf(c) + 1;
            const V = VERDICT[v.verdict];
            return (
              <li key={v.claimId}>
                <button type="button" className={cx("ev-row", v.claimId === sel.claimId && "is-sel", V.cls)} aria-current={v.claimId === sel.claimId} onClick={() => s.setSelected(v.claimId)}>
                  <span className="mono dim">C-{String(n).padStart(2, "0")}</span>
                  <span className="ev-text">{c.text}</span>
                  <span className="ev-glyph" aria-label={V.label}>
                    <V.Icon size={14} strokeWidth={2.4} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="panel detail swap" ref={detailRef} key={sel.claimId}>
          <div className="detail-head">
            <Stamp verdict={sel.verdict} />
            {sel.proposedVerdict && sel.proposedVerdict !== sel.verdict && (
              <span className="small muted">AI proposed {VERDICT[sel.proposedVerdict].label.toLowerCase()}; downgraded because no quote was verified</span>
            )}
            {sel.consequence !== "NONE" && <span className="small muted">Consequence: {sel.consequence.toLowerCase()}</span>}
          </div>
          <p className="detail-claim">
            <span className="mono dim">C-{String(idx).padStart(2, "0")}</span> {claim.text}
          </p>
          {sel.downgradeReason ? (
            <div className="hatch-note">
              <p className="eyebrow">Unverified reasoning</p>
              <p>{sel.explanation}</p>
            </div>
          ) : (
            <p className="detail-expl">{sel.explanation}</p>
          )}

          {sel.evidence.map((q, k) => (
            <Exhibit key={k} q={q} label={`EXHIBIT ${String(idx).padStart(2, "0")}·${String.fromCharCode(65 + k)}`} />
          ))}

          {sel.rejectedQuotes.length > 0 && (
            <div className="inadmissible">
              <p className="eyebrow">Inadmissible</p>
              {sel.rejectedQuotes.map((q, k) => (
                <div key={k} className="rej">
                  <p className="small">
                    <span className="mono">{q.claimedFile}</span> · {REJECT_REASON[q.status] ?? q.status}
                  </p>
                  <p className="rej-quote mono">{q.claimedText}</p>
                </div>
              ))}
            </div>
          )}

          {(sel.alternativeInterpretation || sel.missingContext) && (
            <dl className="context">
              {sel.alternativeInterpretation && (
                <>
                  <dt className="eyebrow">Could also mean</dt>
                  <dd>{sel.alternativeInterpretation}</dd>
                </>
              )}
              {sel.missingContext && (
                <>
                  <dt className="eyebrow">Not in the files</dt>
                  <dd>{sel.missingContext}</dd>
                </>
              )}
            </dl>
          )}
          {sel.verdict === "SUPPORTED" && <Notice tone="success" title="The code matches your claim" />}
        </div>
      </div>

      <div className="page-actions">
        <Button variant="ghost" onClick={() => s.go("claims")}>
          <ArrowLeft aria-hidden size={16} /> Back
        </Button>
        <Button onClick={() => s.go("prove")}>
          Test the findings <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
