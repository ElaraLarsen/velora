import { ArrowRight, FileCode2, FolderUp, Lock, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { SourceFile } from "../../shared/types";
import { CONTEXT, FILES, LIMITS, byteLength, countLines, fmtBytes, validateSourceFiles } from "../data";
import { demoDelay, useSession } from "../state";
import { Button, Capsule, DemoTag, Notice, PageHead, cx, i } from "../ui";

/** A fabricated file larger than the per-file limit, used to show the real validation error. */
function oversizedFile(): SourceFile {
  const line = "// padding line used only to demonstrate the size limit in the prototype\n";
  return { name: "src/generated/huge-bundle.js", content: line.repeat(Math.ceil((LIMITS.maxFileBytes + 4000) / line.length)) };
}

export function Load() {
  const s = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [reading, setReading] = useState(false);
  const problems = s.files.length ? validateSourceFiles(s.files) : [];
  const total = s.files.reduce((n, f) => n + byteLength(f.content), 0);
  const lines = s.files.reduce((n, f) => n + countLines(f.content), 0);
  const ready = s.files.length > 0 && problems.length === 0;

  async function read(list: FileList | null) {
    if (!list?.length) return;
    setReading(true);
    const incoming = await Promise.all(Array.from(list).map(async (f) => ({ name: f.name, content: await f.text() })));
    await demoDelay(s, 500);
    const base = s.usingSample ? [] : s.files;
    s.setFiles([...base.filter((f) => !incoming.some((x) => x.name === f.name)), ...incoming], false);
    setReading(false);
  }

  async function loadSample() {
    setReading(true);
    await demoDelay(s, 700);
    s.setFiles(FILES, true);
    s.setContext(CONTEXT);
    setReading(false);
  }

  return (
    <div className="page-inner">
      <PageHead
        n="01"
        label="Load"
        title="Bring the code for one feature."
        lede="Upload the files behind a single feature. Handwave keeps them sealed: you won't see a line of code until you've explained the feature yourself."
        aside={
          <div className="limits">
            <Capsule>Up to {LIMITS.maxFiles} files</Capsule>
            <Capsule>{fmtBytes(LIMITS.maxTotalBytes)} total</Capsule>
          </div>
        }
      />

      <div className="load-grid">
        <div
          className={cx("panel bay enter", drag && "is-drag", reading && "is-reading")}
          style={i(3)}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void read(e.dataTransfer.files);
          }}
        >
          <div className="bay-aperture" aria-hidden>
            <span className="aperture-ring" />
            <Upload size={24} />
          </div>
          <p className="h3">{reading ? "Reading files…" : drag ? "Release to dock the files" : "Drop source files into the bay"}</p>
          <p className="small muted center-text">Files are read in this browser tab only. The prototype sends nothing anywhere.</p>
          <div className="row gap wrap center">
            <Button onClick={() => input.current?.click()} disabled={reading}>
              <FileCode2 aria-hidden size={17} /> Choose files
            </Button>
            <Button variant="chrome" onClick={() => void loadSample()} status={reading ? "loading" : "idle"}>
              <FolderUp aria-hidden size={16} /> Load the sample project
            </Button>
          </div>
          <input ref={input} type="file" multiple className="sr-only" aria-label="Choose source files" onChange={(e) => void read(e.target.files)} />
        </div>

        <div className="panel manifest enter" style={i(4)}>
          <div className="manifest-head brushed">
            <span className="eyebrow">Manifest</span>
            <span className={cx("seal", ready && "is-sealed")}>
              <Lock aria-hidden size={14} /> {ready ? "Sealed until you explain" : s.files.length ? "Needs attention" : "Awaiting files"}
            </span>
          </div>

          {s.files.length === 0 ? (
            <div className="empty">
              <p className="h4">The bay is empty.</p>
              <p className="muted">Choose files, load the sample project, or try an oversized file to see how errors look.</p>
              <Button variant="ghost" onClick={() => s.setFiles([oversizedFile()], false)}>
                Try an oversized file
              </Button>
            </div>
          ) : (
            <ol className="manifest-list" aria-label="Docked files">
              {s.files.map((f, k) => {
                const bad = problems.some((p) => p.file === f.name);
                return (
                  <li key={f.name} className={cx("dock-row", bad && "is-bad")} style={i(k)}>
                    <span className="mono dim">FILE {String(k + 1).padStart(2, "0")}</span>
                    <span className="mono path" title={f.name}>
                      {f.name}
                    </span>
                    <span className="mono dim num">{countLines(f.content).toLocaleString()} ln</span>
                    <span className="mono dim num">{fmtBytes(byteLength(f.content))}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => s.setFiles(s.files.filter((x) => x.name !== f.name), false)}
                    >
                      <X size={15} aria-hidden />
                    </button>
                    <span className="dock-bar" aria-hidden>
                      <span />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="gauge">
            <div className="row between">
              <span className="eyebrow">Capacity</span>
              <span className="mono small">
                {fmtBytes(total)} of {fmtBytes(LIMITS.maxTotalBytes)} · {lines.toLocaleString()} lines
              </span>
            </div>
            <div className="gauge-track" role="meter" aria-valuemin={0} aria-valuemax={LIMITS.maxTotalBytes} aria-valuenow={total} aria-label="Upload capacity used">
              <span className={cx(total > LIMITS.maxTotalBytes && "over")} style={{ width: `${Math.min(100, (total / LIMITS.maxTotalBytes) * 100)}%` }} />
            </div>
          </div>
          {s.usingSample && (
            <p className="specimen">
              <DemoTag>Sample project</DemoTag> Written for Handwave's demo mode ({CONTEXT}). Not a real user's app.
            </p>
          )}
        </div>
      </div>

      {problems.length > 0 && (
        <div className="enter">
          <Notice
            tone="error"
            title="A few things need attention before continuing"
            action={
              <Button variant="chrome" onClick={() => s.setFiles([], false)}>
                Clear files
              </Button>
            }
          >
            <ul className="plain-list">
              {problems.map((p, k) => (
                <li key={k}>
                  {p.file && <span className="mono">{p.file}: </span>}
                  {p.message}
                </li>
              ))}
            </ul>
            <p className="small muted">This message comes from Handwave's real file validation.</p>
          </Notice>
        </div>
      )}

      <div className="field-row enter" style={i(5)}>
        <label className="field">
          <span className="field-label">
            How is the app set up? <span className="muted">(optional)</span>
          </span>
          <input value={s.context} onChange={(e) => s.setContext(e.target.value)} maxLength={200} placeholder="e.g. Supabase database, email login, built with React" />
          <span className="field-hint">{s.context.length}/200 characters</span>
        </label>
        <Notice tone="info" title="Where your code goes">
          In live mode, files are sent to the configured AI provider for the evidence check. Handwave does not store them. Don't upload secrets or code you
          aren't allowed to share.
        </Notice>
      </div>

      <div className="page-actions">
        <span className="small muted">{ready ? `${s.files.length} files sealed and ready.` : "Add files to continue."}</span>
        <Button disabled={!ready} onClick={() => s.go("explain")}>
          Continue to explain <ArrowRight aria-hidden size={17} />
        </Button>
      </div>
    </div>
  );
}
