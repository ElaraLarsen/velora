
import { AlertTriangle, Check, CircleHelp, X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Verdict } from "../shared/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary:
      "border border-ink bg-ink text-paper shadow-sm hover:opacity-90 disabled:opacity-40",
    secondary:
      "border border-rule-strong bg-card text-ink hover:border-ink hover:bg-paper-2 disabled:opacity-40",
    ghost:
      "border border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink disabled:opacity-40",
    danger:
      "border border-transparent text-bad hover:bg-bad-bg disabled:opacity-40",
  };

  return (
    <button
      {...rest}
      type={type}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium tracking-[-0.01em] transition-[background-color,border-color,color,opacity,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
      {children}
    </p>
  );
}

export function StepHeading({
  index,
  title,
  lede,
}: {
  index: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <header className="hw-step-head mb-8 sm:mb-10">
      <Eyebrow>Step {index}</Eyebrow>
      <h1 className="mt-3 max-w-[22ch] font-serif text-[2.4rem] font-bold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[3.33rem] [&_em]:font-normal [&_em]:text-highlight">
        {title}
      </h1>
      {lede && (
        <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-7 text-ink-2 sm:text-[1.1875rem] sm:leading-[1.6]">
          {lede}
        </p>
      )}
    </header>
  );
}

export const VERDICT_META: Record<
  Verdict,
  { label: string; color: string; bg: string; Icon: typeof Check }
> = {
  SUPPORTED: {
    label: "Supported",
    color: "text-ok",
    bg: "bg-ok-bg",
    Icon: Check,
  },
  CONTRADICTED: {
    label: "Contradicted",
    color: "text-bad",
    bg: "bg-bad-bg",
    Icon: X,
  },
  NOT_VERIFIABLE: {
    label: "Not verifiable",
    color: "text-unk",
    bg: "bg-unk-bg",
    Icon: CircleHelp,
  },
};

export function VerdictStamp({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];

  return (
    <span
      className={cx(
        "stamp inline-flex items-center gap-1.5 rounded-sm px-2 py-1",
        m.color,
      )}
    >
      <m.Icon aria-hidden className="size-3.5" />
      {m.label}
    </span>
  );
}

export function Alert({
  children,
  tone = "bad",
}: {
  children: ReactNode;
  tone?: "bad" | "note";
}) {
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={cx(
        "flex gap-3 rounded-lg border px-4 py-3.5 text-sm leading-relaxed",
        tone === "bad"
          ? "border-bad/30 bg-bad-bg text-ink"
          : "border-rule bg-paper-2 text-ink-2",
      )}
    >
      <AlertTriangle
        aria-hidden
        className={cx(
          "mt-0.5 size-4 shrink-0",
          tone === "bad" ? "text-bad" : "text-muted",
        )}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Renders source text with real line numbers. Only ever given text cut from an uploaded file. */
export function CodeLines({
  text,
  firstLine,
}: {
  text: string;
  firstLine: number;
}) {
  const lines = text.split("\n");

  return (
    <pre className="overflow-x-auto rounded-lg border border-rule bg-code py-3 font-mono text-[0.78rem] leading-[1.75] text-ink">
      <code className="grid min-w-max grid-cols-[auto_1fr]">
        {lines.map((line, i) => (
          <span key={i} className="contents">
            <span className="select-none border-r border-rule px-3 text-right text-muted tabular-nums sm:px-4">
              {firstLine + i}
            </span>
            <span className="whitespace-pre px-3 sm:px-4">
              {line || " "}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-2">
      <span
        aria-hidden
        className="size-3.5 animate-spin rounded-full border-2 border-rule-strong border-t-ink motion-reduce:animate-none"
      />
      {label}
    </span>
  );
}
