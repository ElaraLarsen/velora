import type { Project } from "../project/types";
import { Button, CodeLines } from "../ui";
import { AUDIT_LABEL, auditClaims, type AuditLabel } from "./analysis/audit";
import { Badge, SectionHeading, SectionTitle } from "./parts";
import { AUDIT_TONE } from "./tones";

const ORDER: AuditLabel[] = ["verified", "contradicted", "risk", "assumption", "unknown"];

export function Audit({ project, unlocked, onOpenClaims }: { project: Project; unlocked: boolean; onOpenClaims?: () => void }) {
  const audit = auditClaims(project);

  return (
    <section aria-labelledby="hk-audit">
      <SectionHeading
        label="Hackathon · Claim audit"
        title={<span id="hk-audit">Every claim, <em>labelled</em> by its evidence.</span>}
        lede="The claims from Studio, labelled from the evidence check you already ran. Only quotes verified in your files count as evidence; nothing is added here."
      />

      <div className="space-y-8">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Claims by label">
          {ORDER.map((l) => (
            <li key={l} className="rounded-lg border border-rule bg-card p-3">
              <p className={`font-serif text-[1.6rem] leading-none ${AUDIT_TONE[l]}`}>{audit.counts[l]}</p>
              <p className="mt-2 text-xs text-ink">{AUDIT_LABEL[l].text}</p>
              <p className="mt-1 text-[0.7rem] leading-snug text-muted">{AUDIT_LABEL[l].meaning}</p>
            </li>
          ))}
        </ul>

        <div>
          <SectionTitle aside={`${audit.items.length} claim${audit.items.length === 1 ? "" : "s"}`}>Audited claims</SectionTitle>
          {audit.items.length ? (
            <ul className="space-y-4">
              {audit.items.map((i) => (
                <li key={i.claimId} className="overflow-hidden rounded-xl border border-rule bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
                    <span className="font-mono text-xs uppercase tracking-wide text-muted">{i.category}</span>
                    <Badge tone={AUDIT_TONE[i.label]}>{AUDIT_LABEL[i.label].text}</Badge>
                  </div>
                  <div className="px-4 py-4 sm:px-5">
                    <p className="font-serif text-[1.15rem] leading-snug text-ink">“{i.text}”</p>
                    <p className="mt-2 text-sm text-ink-2">{i.reason}</p>
                    {unlocked &&
                      i.verdict?.evidence.slice(0, 2).map((q, n) =>
                        q.location && q.linesText ? (
                          <div key={n} className="mt-3">
                            <p className="mb-1.5 break-all font-mono text-[0.72rem] text-muted">{q.location.file} · line {q.location.lineStart}</p>
                            <CodeLines text={q.linesText} firstLine={q.location.lineStart} />
                          </div>
                        ) : null,
                      )}
                    {i.label === "contradicted" && i.verdict?.manualTest.steps.length ? (
                      <p className="mt-3 text-sm text-ink-2">
                        Needs a manual test in your running app: {project.studio.findings[i.claimId] && project.studio.findings[i.claimId]!.status !== "untested"
                          ? project.studio.findings[i.claimId]!.status === "confirmed" ? "confirmed in your testing." : "ruled a false alarm in your testing."
                          : "not tested yet (Studio, step 5)."}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-rule bg-card px-5 py-6">
              <p className="text-sm text-ink-2">No claims yet. Explain the feature and confirm your claims in Studio; the audit uses the same claims and evidence.</p>
              {onOpenClaims && (
                <Button className="mt-4" onClick={onOpenClaims}>
                  Open Studio
                </Button>
              )}
            </div>
          )}
        </div>

        {!audit.current && (
          <p className="text-sm text-bad">These results were produced for a different set of files. Run the evidence check again in Studio.</p>
        )}
        <p className="text-sm leading-relaxed text-muted">
          Labels come from a static reading of the uploaded files. “Verified” means a quote in the code supports the claim, not that the
          app was seen working; contradicted claims need testing in the running app.
        </p>
      </div>
    </section>
  );
}
