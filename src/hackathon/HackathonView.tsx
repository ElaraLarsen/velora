import { CalendarClock, ClipboardCheck, FileText, Gauge, Layers, MessagesSquare, Scale, ShieldCheck } from "lucide-react";
import type { ModeInfo } from "../api";
import type { MaterialId } from "../artwork/materials";
import type { HackathonSection, Project } from "../project/types";
import { Button, cx } from "../ui";
import { Audit } from "./Audit";
import { Guardian } from "./Guardian";
import { Judge } from "./Judge";
import { SectionHeading } from "./parts";
import { Planner, PlannerReminders } from "./Planner";
import { Readiness } from "./Readiness";
import { Report } from "./Report";
import { Rubric } from "./Rubric";
import { Stack } from "./Stack";

export const SECTIONS: { id: HackathonSection; label: string; Icon: typeof Gauge }[] = [
  { id: "readiness", label: "Readiness", Icon: Gauge },
  { id: "stack", label: "Tech stack", Icon: Layers },
  { id: "audit", label: "Claim audit", Icon: ShieldCheck },
  { id: "judge", label: "Judge Q&A", Icon: MessagesSquare },
  { id: "report", label: "Report", Icon: FileText },
  { id: "planner", label: "Planner", Icon: CalendarClock },
  { id: "guardian", label: "Submission", Icon: ClipboardCheck },
  { id: "rubric", label: "Rubric", Icon: Scale },
];

/** Each section's metal (docs/HACKATHON_MATERIALS.md): its page surfaces, sculpture and navigation dot. */
export const SECTION_MATERIAL: Record<HackathonSection, MaterialId> = {
  readiness: "sapphire",
  stack: "graphite",
  audit: "titanium",
  judge: "copper",
  report: "pearl",
  planner: "violet",
  guardian: "glacier",
  rubric: "tungsten",
};

/** Sections that work without uploaded files: they hold the user's own plan, not code analysis. */
const PLANNING: HackathonSection[] = ["planner", "guardian", "rubric"];

/** One line per section for the empty state, so a first-time user knows what each one gives them. */
const SECTION_HINT: Record<HackathonSection, string> = {
  readiness: "what's done, what's missing and what to check before you demo.",
  stack: "the languages, frameworks and services your files actually use, with file and line.",
  audit: "each of your claims labelled verified, contradicted, risk, assumption or unknown.",
  judge: "likely judge questions, answered only from your evidence, with gaps marked.",
  report: "all of it as a Markdown file you can download or copy.",
  planner: "your submission deadline, a live countdown, tasks, milestones and team owners.",
  guardian: "the deliverables your hackathon asks for, ticked off as you go.",
  rubric: "the judging criteria and weights, with your own estimated score.",
};

/** Hackathon navigation: the same list and current-plate treatment as the Studio steps. */
export function HackathonNav({ section, onSection }: { section: HackathonSection; onSection: (s: HackathonSection) => void }) {
  return (
    <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
      {SECTIONS.map((s) => {
        const current = s.id === section;
        return (
          <li key={s.id} className="shrink-0">
            <button
              onClick={() => onSection(s.id)}
              aria-current={current ? "page" : undefined}
              className={cx(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                current ? "bg-ink text-paper" : "text-ink hover:bg-paper-2",
              )}
            >
              <span aria-hidden="true" className={`hw-dot hw-dot-${SECTION_MATERIAL[s.id]}`} />
              <s.Icon aria-hidden className="size-4 shrink-0 opacity-80" />
              <span className="font-medium">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function HackathonView({
  project,
  mode,
  onOpenStudio,
  onSection,
}: {
  project: Project;
  mode: ModeInfo | null;
  /** Back to Studio; with `step` 3 or 1 it opens that step when it's already reachable. */
  onOpenStudio: (step?: 1 | 3) => void;
  onSection: (s: HackathonSection) => void;
}) {
  const { section } = project.view;
  // Studio keeps the code locked until the claims have been checked; Hackathon respects that.
  const unlocked = project.studio.reached >= 4;
  const live = mode?.mode === "live";

  const planning = PLANNING.includes(section);

  // The report also opens without files, so a plan can be exported before any code is loaded.
  if (!project.files.length && !planning && section !== "report") {
    return (
      <section aria-labelledby="hk-empty">
        <SectionHeading
          label="Hackathon"
          title={<span id="hk-empty">Start with the <em>code</em>.</span>}
          lede="Hackathon Mode works on the same project as Studio. Load the files behind one feature in Studio first; every section here then reads those same files, claims and evidence."
        />
        <Button variant="primary" onClick={() => onOpenStudio(1)}>
          Load files in Studio
        </Button>
        <p className="mt-4 text-sm text-ink-2">No files to hand? Studio's Load step has a sample project you can try first.</p>
        <ul className="mt-8 max-w-xl space-y-3">
          {SECTIONS.map((s) => (
            <li key={s.id} className="flex gap-3 text-sm leading-relaxed">
              <s.Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-2" />
              <span className="text-ink-2">
                <span className="font-medium text-ink">{s.label}: </span>
                {SECTION_HINT[s.id]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-2">
          Planner, Submission and Rubric work without files, so you can{" "}
          <button onClick={() => onSection("planner")} className="text-ink underline underline-offset-4 hover:text-highlight">
            start planning now
          </button>
          .
        </p>
        <p className="mt-3 text-sm text-muted">Up to 12 files, 150 KB each, 250 KB in total. Velora reads only the files you upload.</p>
      </section>
    );
  }

  return (
    <div key={section} className="rise">
      {section !== "planner" && <PlannerReminders onOpen={() => onSection("planner")} />}
      {section === "readiness" && <Readiness project={project} live={live} />}
      {section === "stack" && <Stack project={project} unlocked={unlocked} />}
      {section === "audit" && <Audit project={project} unlocked={unlocked} onOpenClaims={() => onOpenStudio(3)} />}
      {section === "judge" && <Judge project={project} unlocked={unlocked} />}
      {section === "report" && <Report project={project} mode={mode} />}
      {section === "planner" && <Planner />}
      {section === "guardian" && <Guardian onSection={onSection} onOpenStudio={() => onOpenStudio(1)} />}
      {section === "rubric" && <Rubric />}
      {!live && !planning && (
        <p className={cx("mt-8 rounded-lg border border-dashed border-rule-strong px-4 py-3 text-sm text-ink-2")}>
          {project.usingSample
            ? "Demo mode: results here come from Velora's built-in sample responses for its sample project. They are not an AI analysis or real findings."
            : "Demo mode: no AI analysis was run on these files, so no claim has been checked against them."}
        </p>
      )}
    </div>
  );
}
