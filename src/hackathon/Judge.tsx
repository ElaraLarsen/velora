import type { Project } from "../project/types";
import { JUDGE_CATEGORY, judgeQuestions } from "./analysis/judge";
import { inspectStack } from "./analysis/stack";
import { Badge, EvidenceList, SectionHeading, SectionTitle } from "./parts";
import { ANSWER_TONE } from "./tones";

export function Judge({ project, unlocked }: { project: Project; unlocked: boolean }) {
  const questions = judgeQuestions(project, inspectStack(project.files, project.context));
  const open = questions.filter((q) => q.status !== "answered").length;

  return (
    <section aria-labelledby="hk-judge">
      <SectionHeading
        label="Hackathon · Judge Q&A"
        title={<span id="hk-judge">What judges will <em>ask</em>.</span>}
        lede="Questions across architecture, technology, security, scale, feasibility, differentiation, limitations and failures. Each answer is put together only from your verified evidence, your claims and your own test results; anything they can't answer is marked."
      />

      <SectionTitle aside={`${questions.length - open} answered · ${open} to prepare`}>Questions</SectionTitle>
      <ol className="space-y-4">
        {questions.map((q) => (
          <li key={q.id} className="overflow-hidden rounded-xl border border-rule bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-eyebrow">{JUDGE_CATEGORY[q.category]}</span>
              <Badge tone={ANSWER_TONE[q.status].tone}>{ANSWER_TONE[q.status].text}</Badge>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="font-serif text-[1.15rem] leading-snug text-ink">{q.question}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{q.answer}</p>
              <EvidenceList evidence={q.evidence} unlocked={unlocked} max={3} />
              {q.prepare && (
                <p className="mt-3 rounded-lg border border-rule px-3 py-2 text-sm text-ink-2">
                  <span className="text-ink">To prepare: </span>
                  {q.prepare}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        Questions come from a fixed set chosen for hackathon judging; the answers are assembled, not written by an AI, so they never
        describe anything the evidence doesn't show.
      </p>
    </section>
  );
}
