import { Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { ModeInfo } from "../api";
import type { Project } from "../project/types";
import { Button } from "../ui";
import { projectReport } from "./analysis/report";
import { SectionHeading, SectionTitle } from "./parts";

export function Report({ project, mode }: { project: Project; mode: ModeInfo | null }) {
  const live = mode?.mode === "live";
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  // Regenerated when the project changes; the timestamp is the moment it was opened.
  const markdown = useMemo(
    () => projectReport(project, { live, provider: mode?.provider, model: mode?.model }, new Date()),
    [project, live, mode?.provider, mode?.model],
  );

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "velora-report.md";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="hk-report">
      <SectionHeading
        label="Hackathon · Report"
        title={<span id="hk-report">The project, <em>on the record</em>.</span>}
        lede="Overview, detected stack, audited claims, readiness, judge questions, your plan, checklist and rubric, and limitations in one Markdown file. Every line says what backs it, and demo results are labelled as demo."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={download}>
          <Download aria-hidden className="size-4" />
          {downloaded ? "Downloaded" : "Download Markdown"}
        </Button>
        <Button onClick={copy}>
          <Copy aria-hidden className="size-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {downloaded ? "velora-report.md downloaded." : copied ? "Report copied to the clipboard." : ""}
      </p>

      <SectionTitle aside="velora-report.md">Preview</SectionTitle>
      <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-rule bg-code p-4 font-mono text-[0.78rem] leading-relaxed text-ink">
        {markdown}
      </pre>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        The report is built in your browser from this project and is not stored anywhere. Refreshing or closing Velora discards the project,
        so download the report if you want to keep it.
      </p>
    </section>
  );
}
