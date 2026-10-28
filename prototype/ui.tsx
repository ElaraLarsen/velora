import { AlertTriangle, Check, CheckCircle2, CircleHelp, Info, X, XCircle } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { Verdict } from "../shared/types";

export function cx(...p: (string | false | null | undefined)[]) {
  return p.filter(Boolean).join(" ");
}

export const i = (n: number) => ({ "--i": n }) as CSSProperties;

/* ---------- buttons ---------- */

export type ButtonVariant = "primary" | "chrome" | "ghost";
export type ButtonStatus = "idle" | "loading" | "success";

/**
 * Primary: the current theme's metal (sapphire, chrome, rose gold, petrol, gold or lacquer).
 * Chrome: the deck's satin-chrome capsule, for secondary actions.
 * Ghost: text with a drawn underline, for low-emphasis actions.
 * `force` pins a visual state, used only by the System page's state gallery.
 */
export function Button({
  variant = "primary",
  status = "idle",
  successLabel,
  force,
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  status?: ButtonStatus;
  successLabel?: ReactNode;
  force?: "hover" | "focus" | "pressed";
}) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || status === "loading"}
      aria-busy={status === "loading" || undefined}
      data-magnetic={variant === "primary" ? "" : undefined}
      className={cx("btn", `btn-${variant}`, status !== "idle" && `is-${status}`, force && `force-${force}`, className)}
    >
      <span className="btn-face">
        {status === "success" ? (
          <>
            <Check aria-hidden size={16} strokeWidth={2.6} /> {successLabel ?? children}
          </>
        ) : (
          children
        )}
      </span>
      {status === "loading" && <span className="btn-progress" aria-hidden />}
      <span className="btn-sheen" aria-hidden />
    </button>
  );
}

/* ---------- type ---------- */

/** The deck's section label: number · name, in tracked small capitals. */
export function Eyebrow({ n, children, className }: { n?: string; children: ReactNode; className?: string }) {
  return (
    <p className={cx("eyebrow", className)}>
      {n && (
        <>
          <span className="eyebrow-n">{n}</span>
          <span aria-hidden> · </span>
        </>
      )}
      {children}
    </p>
  );
}

export function PageHead({ n, label, title, lede, aside }: { n: string; label: string; title: ReactNode; lede: ReactNode; aside?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        <Eyebrow n={n} className="enter" >
          {label}
        </Eyebrow>
        <h1 className="h1 enter" style={i(1)}>
          {title}
        </h1>
        <p className="lede enter" style={i(2)}>
          {lede}
        </p>
      </div>
      {aside && <div className="page-head-aside enter" style={i(3)}>{aside}</div>}
    </header>
  );
}

/* ---------- status ---------- */

export const VERDICT: Record<Verdict, { label: string; cls: string; Icon: typeof Check }> = {
  SUPPORTED: { label: "Supported", cls: "v-ok", Icon: Check },
  CONTRADICTED: { label: "Contradicted", cls: "v-bad", Icon: X },
  NOT_VERIFIABLE: { label: "Not verifiable", cls: "v-unk", Icon: CircleHelp },
};

export function Stamp({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span className={cx("stamp", v.cls)}>
      <v.Icon aria-hidden size={14} strokeWidth={2.4} />
      {v.label}
    </span>
  );
}

const NOTICE_ICON = { info: Info, warn: AlertTriangle, error: XCircle, success: CheckCircle2 };

export function Notice({ tone, title, children, action }: { tone: keyof typeof NOTICE_ICON; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div className={cx("notice", `notice-${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden size={18} className="notice-icon" />
      <div className="notice-body">
        <p className="notice-title">{title}</p>
        {children && <div className="notice-text">{children}</div>}
      </div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}

/** Marks prototype data or concept screens, so nothing reads as a working feature. */
export function DemoTag({ children = "Illustrative data" }: { children?: ReactNode }) {
  return <span className="demo-tag">{children}</span>;
}

/** The deck's satin-chrome capsule, used for tags and tool chips. */
export function Capsule({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("capsule", className)}>{children}</span>;
}

/** The gold sweep from the deck's cover slide. */
export function Swoosh({ className }: { className?: string }) {
  return (
    <svg className={cx("swoosh", className)} viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="swooshG" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#B08A4F" stopOpacity="0" />
          <stop offset="0.35" stopColor="#F3E0B0" stopOpacity="0.9" />
          <stop offset="0.7" stopColor="#B08A4F" />
          <stop offset="1" stopColor="#6F5420" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path d="M0 108 C 380 104, 760 86, 1200 8" fill="none" stroke="url(#swooshG)" strokeWidth="3" />
      <path d="M0 114 C 420 110, 820 92, 1200 22" fill="none" stroke="url(#swooshG)" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
