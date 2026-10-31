import { AlertTriangle, CircleHelp, Info, Rocket, XCircle } from "lucide-react";
import { useMemo } from "react";
import type { SourceFile } from "../../shared/types";
import { SectionTitle } from "../hackathon/parts";
import { cx } from "../ui";
import { inspectDeploy, type Issue, type Support } from "./detect";

const ISSUE: Record<Issue["level"], { Icon: typeof Info; tone: string; label: string }> = {
  blocker: { Icon: XCircle, tone: "text-bad", label: "Blocks deployment" },
  warning: { Icon: AlertTriangle, tone: "text-highlight", label: "Warning" },
  info: { Icon: Info, tone: "text-ink-2", label: "Note" },
};

const SUPPORT: Record<Support, string> = { supported: "Supported", unsupported: "Not a good fit", unknown: "Can't tell yet" };

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={cx("text-right font-mono text-[0.8rem]", value ? "text-ink" : "text-muted")}>{value ?? "Not detected"}</dd>
    </div>
  );
}

/**
 * Deploy readiness from the loaded files. It's a check, not a deployment: nothing is uploaded and
 * no provider is contacted.
 */
export function DeployCheck({ files, onLoad }: { files: SourceFile[]; onLoad: () => void }) {
  const r = useMemo(() => inspectDeploy(files), [files]);
  return (
    <div className="mt-12">
      <SectionTitle aside={files.length ? `From ${r.basis} loaded file${r.basis === 1 ? "" : "s"}` : undefined}>Deploy readiness</SectionTitle>
      <div className="rounded-xl border border-rule bg-card">
        <p className="flex items-start gap-3 border-b border-rule px-4 py-3 text-sm leading-relaxed text-ink-2 sm:px-5">
          <Rocket aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            Velora doesn't deploy projects yet. Deploying needs your own Vercel or Netlify account connected through a secure server-side integration, which this
            version doesn't have. This check reads only the files you loaded and sends nothing anywhere.
          </span>
        </p>
        {!files.length ? (
          <p className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink-2 sm:px-5">
            Load your project files in Studio, including package.json, to check them.
            <button onClick={onLoad} className="min-h-9 text-sm text-ink underline underline-offset-4">
              Open Studio
            </button>
          </p>
        ) : (
          <>
            <dl className="divide-y divide-rule">
              <Row label="Framework" value={r.framework} />
              <Row label="Install" value={r.install} />
              <Row label="Build command" value={r.build} />
              <Row label="Output folder" value={r.output} />
              <Row label="Vercel" value={SUPPORT[r.providers.vercel]} />
              <Row label="Netlify" value={SUPPORT[r.providers.netlify]} />
            </dl>
            {r.env.length > 0 && (
              <div className="border-t border-rule px-4 py-3 sm:px-5">
                <p className="text-sm font-medium text-ink">Environment variables the code reads</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.env.map((v) => (
                    <li key={v.name} title={v.files.join(", ")} className={cx("rounded-md border px-2 py-0.5 font-mono text-[0.72rem]", v.public ? "border-rule text-ink-2" : "border-rule-strong text-ink")}>
                      {v.name}
                      <span className="sr-only">{v.public ? " (public)" : " (server only)"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">Names only. Velora never reads or shows their values.</p>
              </div>
            )}
            {r.issues.length > 0 && (
              <ul className="divide-y divide-rule border-t border-rule">
                {r.issues.map((i, n) => {
                  const m = ISSUE[i.level];
                  return (
                    <li key={n} className="flex gap-3 px-4 py-3 text-sm leading-relaxed sm:px-5">
                      <m.Icon aria-hidden className={cx("mt-0.5 size-4 shrink-0", m.tone)} />
                      <span className="text-ink-2">
                        <span className={cx("font-medium", m.tone)}>{m.label}: </span>
                        {i.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {(
              <p className="flex gap-3 border-t border-rule px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
                <CircleHelp aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Based only on the loaded files, not the whole repository. A real deployment would build from the full repository.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
