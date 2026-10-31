import { FileQuestion, FileCheck2 } from "lucide-react";
import type { Project } from "../project/types";
import { AUDIT_LABEL } from "./analysis/audit";
import { readiness } from "./analysis/readiness";
import { Badge, CheckRow, SectionHeading, SectionTitle } from "./parts";
import { AUDIT_TONE } from "./tones";

export function Readiness({ project, live }: { project: Project; live: boolean }) {
  const r = readiness(project, live);
  const done = r.completeness.filter((c) => c.status === "done").length;

  return (
    <section aria-labelledby="hk-readiness">
      <SectionHeading
        label="Hackathon · Readiness"
        title={<span id="hk-readiness">How ready is <em>this</em> project?</span>}
        lede="Where the project stands, from the files, claims and evidence you've already worked through in Studio. Nothing here is re-analysed."
      />

      <div className="space-y-8">
        <div>
          <SectionTitle aside={`${done} of ${r.completeness.length} done`}>Project completeness</SectionTitle>
          <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
            {r.completeness.map((c) => <CheckRow key={c.id} status={c.status} label={c.label} detail={c.detail} />)}
          </ul>
        </div>

        <div>
          <SectionTitle aside="Among the uploaded files">Documentation</SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-3">
            {r.missingDocs.map((d) => (
              <li key={d.label} className="rounded-lg border border-rule bg-card p-4">
                {d.present ? <FileCheck2 aria-hidden className="size-5 text-ok" /> : <FileQuestion aria-hidden className="size-5 text-muted" />}
                <p className="mt-2 text-sm text-ink">{d.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  {d.present ? d.files.join(", ") : "Not among the uploaded files. Velora only sees what you upload, so it may exist in your repository."}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionTitle aside={r.unverified.length ? `${r.unverified.length}` : undefined}>Unverified claims</SectionTitle>
          {r.unverified.length ? (
            <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
              {r.unverified.map((i) => (
                <li key={i.claimId} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:px-5">
                  <p className="min-w-0 flex-1 font-serif text-[1.02rem] text-ink">“{i.text}”</p>
                  <Badge tone={AUDIT_TONE[i.label]}>{AUDIT_LABEL[i.label].text}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-rule bg-card px-4 py-3 text-sm text-ink-2">
              {project.studio.verdicts.length ? "Every checked claim is either supported or contradicted by the code." : "No claims have been checked yet."}
            </p>
          )}
        </div>

        <div>
          <SectionTitle>Evidence gaps</SectionTitle>
          {r.evidenceGaps.length ? (
            <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
              {r.evidenceGaps.map((g) => (
                <li key={g.claimId} className="px-4 py-3 sm:px-5">
                  <p className="font-serif text-[1.02rem] text-ink">“{g.text}”</p>
                  <p className="mt-1 text-sm text-ink-2">
                    {g.rejectedQuotes} quote{g.rejectedQuotes === 1 ? " was" : "s were"} rejected because {g.rejectedQuotes === 1 ? "it isn't" : "they aren't"} in the uploaded files as cited
                    {g.downgraded ? "; with no verified quote left, the claim was marked not verifiable" : ""}.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-rule bg-card px-4 py-3 text-sm text-ink-2">
              {project.studio.verdicts.length ? "Every quote the analysis cited was found in your files." : "Available after the evidence check."}
            </p>
          )}
        </div>

        <div>
          <SectionTitle>Demo readiness</SectionTitle>
          <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
            {r.demo.map((c) => <CheckRow key={c.id} status={c.status} label={c.label} detail={c.detail} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}
