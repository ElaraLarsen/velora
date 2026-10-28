import { ArrowRight, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { PAGES, useSession } from "../state";
import { THEMES } from "../themes";
import { Button, Eyebrow, Swoosh } from "../ui";

const STEPS: [string, string][] = [
  ["Load", "Bring the files behind one feature. They stay sealed."],
  ["Explain", "Say what you believe the feature does, in your own words."],
  ["Claims", "Your explanation becomes claims you confirm, before any code is read."],
  ["Evidence", "Each claim is checked. Only quotes found in your files are admitted."],
  ["Prove", "Test the findings in your app, rule on them, take the fix brief."],
];

export function Instrument() {
  const s = useSession();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-scrim" aria-hidden />
      <div className="hero-strip intro" style={{ "--d": 2 } as CSSProperties}>
        <Eyebrow>Handwave · Evidence instrument</Eyebrow>
        <span className="strip-rule" />
        <span className="demo-tag">Design prototype</span>
      </div>

      <div className="hero-body">
        <h1 id="hero-title" className="display">
          <span className="line"><span className="intro-rise" style={{ "--d": 4 } as CSSProperties}>Say what you think</span></span>
          <span className="line"><span className="intro-rise" style={{ "--d": 5 } as CSSProperties}>your code does.</span></span>
        </h1>
        <p className="display-sub intro" style={{ "--d": 7 } as CSSProperties}>
          <em>Then see the lines.</em>
        </p>
        <p className="hero-lede intro" style={{ "--d": 9 } as CSSProperties}>
          Handwave turns your explanation into claims, checks each one against your source, and admits only quotes it can find in the
          file, <span className="hl">line for line</span>.
        </p>
        <div className="hero-actions intro" style={{ "--d": 10 } as CSSProperties}>
          <Button onClick={() => s.go("load")}>
            Begin an investigation <ArrowRight aria-hidden size={17} />
          </Button>
          <Button variant="ghost" onClick={s.replayIntro}>
            <RotateCcw aria-hidden size={15} /> Replay opening
          </Button>
        </div>
      </div>

      <ol className="hero-steps" aria-label="How Handwave works">
        {STEPS.map(([label, text], k) => {
          const page = PAGES.find((p) => p.label === label)!;
          const t = THEMES[page.theme];
          return (
            <li key={label} className="intro" style={{ "--d": 11 + k * 0.6 } as CSSProperties}>
              <button type="button" className="step-card" onClick={() => s.go(page.id)}>
                <span className={`swatch swatch-${t.id}`} aria-hidden />
                <span className="eyebrow">
                  <span className="eyebrow-n">{page.n}</span> · {label}
                </span>
                <span className="step-text">{text}</span>
                <span className="step-material">{t.name}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <Swoosh className="hero-swoosh intro" />
    </section>
  );
}
