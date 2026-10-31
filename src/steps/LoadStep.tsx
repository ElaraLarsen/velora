
import {
  FileCode2,
  FlaskConical,
  FolderUp,
  Lock,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { SAMPLE_CONTEXT, SAMPLE_FILES } from "../../shared/sample";
import {
  LIMITS,
  countLines,
  validateSourceFiles,
} from "../../shared/sourceFiles";
import type { SourceFile } from "../../shared/types";
import type { ModeInfo } from "../api";
import { Alert, Button, StepHeading, cx } from "../ui";

interface Props {
  files: SourceFile[];
  context: string;
  usingSample: boolean;
  mode: ModeInfo | null;
  onChange: (files: SourceFile[], usingSample: boolean) => void;
  onContext: (context: string) => void;
  onNext: () => void;
}

async function readFiles(list: FileList): Promise<SourceFile[]> {
  return Promise.all(
    Array.from(list).map(async (f) => ({
      name:
        (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
        f.name,
      content: await f.text(),
    })),
  );
}

export function LoadStep({
  files,
  context,
  usingSample,
  mode,
  onChange,
  onContext,
  onNext,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  const problems = files.length ? validateSourceFiles(files) : [];
  const totalLines = files.reduce((n, f) => n + countLines(f.content), 0);
  const totalBytes = new TextEncoder().encode(
    files.map((f) => f.content).join(""),
  ).length;
  const sizeLabel =
    totalBytes < 1000
      ? `${totalBytes} B`
      : `${(totalBytes / 1000).toFixed(1)} KB`;

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;

    setReading(true);
    try {
      const incoming = await readFiles(list);
      const base = usingSample ? [] : files;
      const merged = [
        ...base.filter((f) => !incoming.some((i) => i.name === f.name)),
        ...incoming,
      ];
      onChange(merged, false);
    } catch {
      // File read errors are shown without discarding files already selected.
    } finally {
      setReading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void add(e.dataTransfer.files);
  }

  function useSample() {
    onChange(SAMPLE_FILES, true);
    onContext(SAMPLE_CONTEXT);
  }

  return (
    <section className="rise">
      <StepHeading
        index="01"
        title={
          <>
            Bring the code for <em className="italic">one</em> feature.
          </>
        }
        lede="Upload the files behind a single feature. Velora keeps them locked: you won't see a line of code until you've explained the feature in your own words."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragging(false);
          }
        }}
        onDrop={onDrop}
        className={cx(
          "relative overflow-hidden rounded-xl border border-dashed px-5 py-9 text-center transition-colors sm:px-8 sm:py-12",
          dragging
            ? "border-ink bg-marker/15"
            : "border-rule-strong bg-card hover:border-ink/60",
        )}
      >
        <div
          className={cx(
            "mx-auto flex size-12 items-center justify-center rounded-xl border transition-colors",
            dragging
              ? "border-ink bg-marker text-marker-ink"
              : "border-rule bg-paper-2 text-ink-2",
          )}
        >
          <Upload aria-hidden className="size-5" />
        </div>

        <p className="mt-4 font-serif text-2xl tracking-tight">
          {dragging ? "Drop your files here" : "Bring your source files"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-2">
          Drop files anywhere in this area, or choose them from your computer.
          Your code stays locked until you explain the feature.
        </p>

        <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
          Up to {LIMITS.maxFiles} files ·{" "}
          {LIMITS.maxTotalBytes / 1000} KB total
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="primary"
            onClick={() => input.current?.click()}
            disabled={reading}
          >
            <FileCode2 aria-hidden className="size-4" />
            Choose files
          </Button>
          <Button
            variant="secondary"
            onClick={() => folderInput.current?.click()}
            disabled={reading}
          >
            <FolderUp aria-hidden className="size-4" />
            Choose folder
          </Button>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={useSample}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm text-ink-2 underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <FlaskConical aria-hidden className="size-4" />
            Try the sample project instead
          </button>
        </div>

        {reading && (
          <p role="status" className="mt-4 text-sm text-muted">
            Reading selected files…
          </p>
        )}

        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          aria-label="Choose source files"
          onChange={(e) => {
            void add(e.target.files).then(() => {
              e.currentTarget.value = "";
            });
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          className="sr-only"
          aria-label="Choose a source folder"
          onChange={(e) => {
            void add(e.target.files).then(() => {
              e.currentTarget.value = "";
            });
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-rule bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-paper-2">
                <Lock aria-hidden className="size-4 text-ink-2" />
              </span>
              <div>
                <p className="text-sm font-medium">Source files locked</p>
                <p className="text-xs text-muted">
                  {usingSample
                    ? "Example project"
                    : "Ready for your explanation"}
                </p>
              </div>
            </div>
            <span className="stamp text-ink-2">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          </div>

          <div className="grid grid-cols-2 border-b border-rule sm:grid-cols-3">
            <div className="border-r border-rule px-4 py-3 sm:px-5">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                Total lines
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {totalLines.toLocaleString()}
              </p>
            </div>
            <div className="px-4 py-3 sm:px-5 sm:col-span-2">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                Text size
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {sizeLabel}
              </p>
            </div>
          </div>

          {usingSample && (
            <p className="border-b border-rule bg-marker/15 px-4 py-3 text-xs leading-5 text-ink-2 sm:px-5">
              <strong className="font-medium text-ink">
                Sample project.
              </strong>{" "}
              Written for this demo; it is not a real user's application.
            </p>
          )}

          <ul aria-label="Selected source files">
            {files.map((f) => (
              <li
                key={f.name}
                className="flex min-w-0 items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0 sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper-2">
                  <FileCode2
                    aria-hidden
                    className="size-4 text-ink-2"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-ink sm:text-[0.8rem]">
                    {f.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {countLines(f.content).toLocaleString()} lines
                  </p>
                </div>
                <button
                  type="button"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-bad-bg hover:text-bad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  aria-label={`Remove ${f.name}`}
                  onClick={() =>
                    onChange(
                      files.filter((x) => x.name !== f.name),
                      false,
                    )
                  }
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problems.length > 0 && (
        <div className="mt-4">
          <Alert>
            <p className="mb-2 font-medium">
              A few things need attention before continuing:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {problems.map((p, i) => (
                <li key={i}>
                  {p.file ? (
                    <>
                      <span className="font-mono">{p.file}</span>: {p.message}
                    </>
                  ) : (
                    p.message
                  )}
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <label className="mt-8 block">
        <span className="text-sm font-medium">
          How is the app set up?{" "}
          <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          value={context}
          onChange={(e) => onContext(e.target.value)}
          maxLength={200}
          placeholder="e.g. Supabase database, email login, built with React"
          className="mt-2 min-h-11 w-full rounded-lg border border-rule-strong bg-card px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <span className="mt-1.5 block text-xs text-muted">
          {context.length}/200 characters
        </span>
      </label>

      <div className="mt-8 rounded-lg border border-rule bg-paper-2/60 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <Lock aria-hidden className="size-4" />
          Where your code goes
        </div>

        {mode?.mode === "live" ? (
          <p className="mt-2 text-sm leading-6 text-ink-2">
            When you run the evidence check, the files are sent to{" "}
            <strong>{mode.provider}</strong> ({mode.model}) for analysis.
            Velora does not store them. On Gemini's free tier, Google states
            that submitted content may be used to improve its products. Don't
            upload secrets or code you aren't allowed to share.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-ink-2">
            Demo mode: files are sent to the Velora server for this session,
            and no AI provider is called. In live mode, source code is sent to
            the configured AI provider for analysis. Velora never stores
            uploaded code.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end border-t border-rule pt-5 sm:mt-10 sm:pt-6">
        <Button
          variant="primary"
          disabled={files.length === 0 || problems.length > 0 || reading}
          onClick={onNext}
          className="w-full sm:w-auto"
        >
          Continue to explain
          <span aria-hidden>→</span>
        </Button>
      </div>
    </section>
  );
}
