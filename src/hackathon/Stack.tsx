import type { Project } from "../project/types";
import { inspectStack, type StackKind } from "./analysis/stack";
import { Badge, EvidenceList, SectionHeading, SectionTitle } from "./parts";

const KIND: Record<StackKind, string> = {
  language: "Language", framework: "Framework", integration: "Service", data: "Data", runtime: "Runtime", library: "Library", config: "Configuration",
};

export function Stack({ project, unlocked }: { project: Project; unlocked: boolean }) {
  const report = inspectStack(project.files, project.context);
  const detected = report.items.filter((i) => i.basis === "detected");
  const assumed = report.items.filter((i) => i.basis === "assumption");

  return (
    <section aria-labelledby="hk-stack">
      <SectionHeading
        label="Hackathon · Tech stack"
        title={<span id="hk-stack">What the code <em>actually</em> uses.</span>}
        lede={`Read from the ${project.files.length} uploaded file${project.files.length === 1 ? "" : "s"} only: file types, imports, package manifests and a few recognisable code patterns. Each detection shows the lines it comes from.`}
      />

      <div className="space-y-8">
        <div>
          <SectionTitle aside={`${detected.length} found`}>Detected in the uploaded files</SectionTitle>
          {detected.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {detected.map((i) => (
                <li key={`${i.kind}:${i.name}`} className="min-w-0 rounded-xl border border-rule bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-serif text-[1.15rem] font-bold text-ink">{i.name}</p>
                    <Badge tone="text-ok">{KIND[i.kind]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{i.how}</p>
                  <EvidenceList evidence={i.evidence} unlocked={unlocked} max={3} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-rule bg-card px-4 py-3 text-sm text-ink-2">Nothing recognisable was found in the uploaded files.</p>
          )}
        </div>

        <div>
          <SectionTitle aside={assumed.length ? `${assumed.length}` : undefined}>Assumptions</SectionTitle>
          {assumed.length ? (
            <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
              {assumed.map((i) => (
                <li key={i.name} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{i.name}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{i.how}. Upload the files that use it to confirm.</p>
                  </div>
                  <Badge tone="text-ink-2">Assumption</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-rule bg-card px-4 py-3 text-sm text-ink-2">Nothing in your setup description is unaccounted for.</p>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted">
          This is a static reading of the uploaded files, not of your whole repository, and not of the app while it runs. A technology that
          isn't listed may still be used in files you didn't upload.
        </p>
      </div>
    </section>
  );
}
