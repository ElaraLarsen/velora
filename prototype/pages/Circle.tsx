import { ArrowRight, Flag, FlaskConical, HandHelping, MessageSquareText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useSession } from "../state";
import { Button, Capsule, Notice, PageHead, cx, i, type ButtonStatus } from "../ui";

interface Note {
  who: string;
  works: string;
  unclear: string;
  suggestion: string;
  mine?: boolean;
}

interface Thread {
  id: string;
  who: string;
  title: string;
  summary: string;
  tags: string[];
  quote: { file: string; lines: string; code: string };
  notes: Note[];
}

// Illustrative members and projects. None of these are real people or real posts.
const THREADS: Thread[] = [
  {
    id: "t1",
    who: "Asha",
    title: "My notes app shows “Saved!” even when saving fails",
    summary: "Handwave contradicted my claim about error messages. I confirmed it in my app. Is wrapping saveNote in try/catch enough?",
    tags: ["failure", "supabase"],
    quote: { file: "src/lib/notes.ts", lines: "L12–13", code: 'console.log("save attempted", error);\nreturn { ok: true };' },
    notes: [
      {
        who: "Wen",
        works: "Your fix brief cites the exact two lines, which made this quick to read.",
        unclear: "Does the editor clear the text before or after the save resolves?",
        suggestion: "Return { ok: false, error } and have the editor keep the text when ok is false.",
      },
    ],
  },
  {
    id: "t2",
    who: "Tom",
    title: "Can other signed-in users read my rows?",
    summary: "The read policy uses using (true). I think I need auth.uid() = user_id, but I'm not sure it covers updates too.",
    tags: ["access", "policies"],
    quote: { file: "supabase/migrations/001_notes.sql", lines: "L10–13", code: 'create policy "Anyone signed in can read notes"\n  on notes for select\n  to authenticated\n  using (true);' },
    notes: [],
  },
  {
    id: "t3",
    who: "Wen",
    title: "Second opinion on a downgraded claim",
    summary: "Handwave couldn't verify where my API key lives because I didn't upload that file. Which files should I add?",
    tags: ["secrets"],
    quote: { file: "src/lib/notes.ts", lines: "not found", code: "const openaiKey = process.env.OPENAI_API_KEY;" },
    notes: [],
  },
];

export function Circle() {
  const s = useSession();
  const [threads, setThreads] = useState(THREADS);
  const [sel, setSel] = useState("t1");
  const [ask, setAsk] = useState("");
  const [attach, setAttach] = useState("none");
  const [askStatus, setAskStatus] = useState<ButtonStatus>("idle");
  const [fb, setFb] = useState({ works: "", unclear: "", suggestion: "" });
  const [fbStatus, setFbStatus] = useState<ButtonStatus>("idle");
  const thread = threads.find((t) => t.id === sel)!;
  const canSend = fb.works.trim() || fb.unclear.trim() || fb.suggestion.trim();

  async function submitAsk() {
    setAskStatus("loading");
    await new Promise((r) => window.setTimeout(r, s.reduced ? 0 : 700));
    setAskStatus("success");
  }

  async function submitNote() {
    setFbStatus("loading");
    await new Promise((r) => window.setTimeout(r, s.reduced ? 0 : 600));
    setThreads((ts) => ts.map((t) => (t.id === sel ? { ...t, notes: [...t.notes, { who: "You", ...fb, mine: true }] } : t)));
    setFb({ works: "", unclear: "", suggestion: "" });
    setFbStatus("success");
    window.setTimeout(() => setFbStatus("idle"), 2200);
  }

  return (
    <div className="page-inner">
      <aside className="panel concept-banner enter" aria-label="Design concept disclosure">
        <span className="concept-mark" aria-hidden>
          <FlaskConical size={20} />
        </span>
        <p className="eyebrow">Design concept · not built</p>
        <p>
          <strong>Handwave has no accounts, messaging or community service today.</strong> Nothing on this page is sent, stored or seen by anyone.
          Members and posts are illustrative.
        </p>
      </aside>

      <PageHead
        n="06"
        label="Circle"
        title={
          <>
            When you're stuck, <em>ask a person.</em>
          </>
        }
        lede="A small, moderated space to get a human second opinion on a finding, or to give careful feedback on someone else's project. Notes cite lines, critique code rather than people, and end with one concrete suggestion."
      />

      <div className="circle-grid">
        <section className="panel ask enter" style={i(3)} aria-labelledby="ask-title">
          <div className="row gap-s">
            <HandHelping size={20} aria-hidden />
            <h2 id="ask-title" className="h3">
              Ask a person
            </h2>
          </div>
          <label className="field">
            <span className="field-label">Where are you stuck?</span>
            <textarea rows={4} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="e.g. I confirmed the contradiction but I don't know which file to change." />
          </label>
          <label className="field">
            <span className="field-label">Attach a finding</span>
            <select value={attach} onChange={(e) => setAttach(e.target.value)}>
              <option value="none">No finding</option>
              {(s.verdicts ?? []).map((v) => {
                const c = s.claims?.find((x) => x.id === v.claimId);
                return (
                  <option key={v.claimId} value={v.claimId}>
                    {c?.text.slice(0, 60)}
                  </option>
                );
              })}
            </select>
            <span className="field-hint">{s.verdicts ? "Only the claim, verdict and quoted lines would be shared, never whole files." : "Run a check to attach one of your findings."}</span>
          </label>
          <Button status={askStatus} successLabel="Kept in this tab · not sent" disabled={!ask.trim()} onClick={() => void submitAsk()}>
            Request a helper <ArrowRight size={16} aria-hidden />
          </Button>
          {askStatus === "success" && (
            <Notice tone="info" title="Concept only">
              In a built version, a named helper would reply here. Nothing was sent.
            </Notice>
          )}
        </section>

        <section className="review enter" style={i(4)} aria-labelledby="review-title">
          <div className="row between wrap gap">
            <h2 id="review-title" className="h3">
              Open for review
            </h2>
            <span className="small muted">{threads.length} illustrative threads</span>
          </div>
          <ul className="thread-list">
            {threads.map((t) => (
              <li key={t.id}>
                <button type="button" className={cx("thread-row", t.id === sel && "is-sel")} aria-current={t.id === sel} onClick={() => setSel(t.id)}>
                  <span className="avatar" aria-hidden>
                    {t.who[0]}
                  </span>
                  <span className="thread-copy">
                    <span className="thread-title">{t.title}</span>
                    <span className="small muted">
                      {t.who} · {t.notes.length} {t.notes.length === 1 ? "note" : "notes"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <article className="panel discussion swap" key={thread.id}>
            <header className="discussion-head">
              <span className="avatar" aria-hidden>
                {thread.who[0]}
              </span>
              <div>
                <p className="h4">{thread.title}</p>
                <p className="small muted">
                  {thread.who} · {thread.tags.map((t) => (
                    <Capsule key={t} className="capsule-s">
                      {t}
                    </Capsule>
                  ))}
                </p>
              </div>
            </header>
            <p>{thread.summary}</p>
            <figure className="mini-exhibit">
              <figcaption className="mono small">
                {thread.quote.file} · {thread.quote.lines}
              </figcaption>
              <pre className="mono">{thread.quote.code}</pre>
            </figure>

            <ol className="notes">
              {thread.notes.map((n, k) => (
                <li key={k} className={cx("note", n.mine && "is-mine")}>
                  <p className="note-who">
                    <span className="avatar avatar-s" aria-hidden>
                      {n.who[0]}
                    </span>
                    {n.who}
                    {n.mine && <span className="small muted">· visible only to you (concept)</span>}
                  </p>
                  <dl>
                    {n.works && (
                      <>
                        <dt>What works</dt>
                        <dd>{n.works}</dd>
                      </>
                    )}
                    {n.unclear && (
                      <>
                        <dt>What's unclear</dt>
                        <dd>{n.unclear}</dd>
                      </>
                    )}
                    {n.suggestion && (
                      <>
                        <dt>One suggestion</dt>
                        <dd>{n.suggestion}</dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
              {thread.notes.length === 0 && <li className="note empty-note muted">No notes yet. Be the first to help.</li>}
            </ol>

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend) void submitNote();
              }}
            >
              <p className="row gap-s field-label">
                <MessageSquareText size={16} aria-hidden /> Leave a note
              </p>
              <div className="composer-grid">
                <label className="field">
                  <span className="field-hint">What works</span>
                  <textarea rows={2} value={fb.works} onChange={(e) => setFb({ ...fb, works: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-hint">What's unclear</span>
                  <textarea rows={2} value={fb.unclear} onChange={(e) => setFb({ ...fb, unclear: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-hint">One suggestion</span>
                  <textarea rows={2} value={fb.suggestion} onChange={(e) => setFb({ ...fb, suggestion: e.target.value })} />
                </label>
              </div>
              <div className="row between wrap gap">
                <span className="small muted">Cite a line. Critique the code, not the person.</span>
                <Button type="submit" variant="primary" status={fbStatus} successLabel="Added in this tab" disabled={!canSend}>
                  Add note
                </Button>
              </div>
            </form>
          </article>
        </section>
      </div>

      <div className="moderation enter" style={i(6)}>
        <div>
          <ShieldCheck size={18} aria-hidden />
          <p>
            <strong>Moderated.</strong> Threads would be hosted by named helpers, and notes without a line reference would be held for review.
          </p>
        </div>
        <div>
          <Flag size={18} aria-hidden />
          <p>
            <strong>Private by default.</strong> Only the claim, verdict and quoted lines would be shared. Never whole files, never secrets.
          </p>
        </div>
      </div>
    </div>
  );
}
