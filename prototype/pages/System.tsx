import { ArrowRight, Check, Copy } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { PAGES } from "../state";
import { THEME_ORDER, THEMES, contrast, pairings, themeVars, type ThemeId } from "../themes";
import { Button, Capsule, Notice, PageHead, Stamp, cx, i, type ButtonStatus } from "../ui";

interface Family {
  name: string;
  role: "Dominant" | "Signature" | "Supporting" | "Accent" | "Reflection only";
  share: string;
  colors: [string, string, string][]; // hex, name, provenance
  /** dark, mid, light stops used to render the material samples */
  stops: [string, string, string];
}

const FAMILIES: Family[] = [
  {
    name: "Black titanium",
    role: "Dominant",
    share: "≈ 55% · backgrounds, frames, workspace",
    colors: [
      ["#07080A", "Obsidian", "img 44, darkened"],
      ["#15181C", "Graphite panel", "img 44, derived"],
      ["#302F2E", "Smoked graphite", "img 44"],
      ["#6D6D70", "Gunmetal", "img 44"],
    ],
    stops: ["#07080A", "#302F2E", "#8C8D91"],
  },
  {
    name: "Liquid sapphire",
    role: "Signature",
    share: "≈ 15% · artwork, active states, key moments",
    colors: [
      ["#0A1132", "Midnight", "img 39"],
      ["#0F316F", "Sapphire", "img 39"],
      ["#174BF8", "Ultramarine", "img 39"],
      ["#09ACF6", "Electric", "img 41"],
      ["#5CC8FF", "Cyan reflection", "img 41, lightened"],
      ["#89B4CC", "Powder satin", "img 54"],
    ],
    stops: ["#061733", "#174BF8", "#9FD8FF"],
  },
  {
    name: "Matte emerald / petrol",
    role: "Supporting",
    share: "≈ 10% · the evidence room",
    colors: [
      ["#1E3528", "Forest", "img 49"],
      ["#2C4333", "Matte emerald", "img 49"],
      ["#102F27", "Deep green", "deck"],
      ["#2F8C8A", "Petrol teal", "img 46"],
      ["#B7CDBC", "Sage", "deck"],
    ],
    stops: ["#0E2119", "#2C4333", "#5FA59A"],
  },
  {
    name: "Burgundy lacquer",
    role: "Supporting",
    share: "≈ 8% · the human voice (Explain, Circle accents)",
    colors: [
      ["#330D0E", "Oxblood", "img 50"],
      ["#4A171A", "Burgundy", "img 50"],
      ["#7A2230", "Lacquer highlight", "img 50, derived"],
    ],
    stops: ["#1A0507", "#4A171A", "#B04A55"],
  },
  {
    name: "Silver and platinum",
    role: "Supporting",
    share: "≈ 7% · lines, controls, chrome capsules",
    colors: [
      ["#F1F3F3", "Polished chrome", "img 53"],
      ["#CECFD0", "Satin platinum", "img 53"],
      ["#AEB1B4", "Brushed steel", "img 53"],
      ["#8D938E", "Satin silver", "img 52"],
      ["#7189B0", "Blue chrome", "img 43"],
    ],
    stops: ["#4A4F55", "#AEB1B4", "#FFFFFF"],
  },
  {
    name: "Champagne and bronze",
    role: "Accent",
    share: "≈ 3% · labels on special moments, rulings",
    colors: [
      ["#F3E0B0", "Champagne", "deck"],
      ["#E3C27E", "Champagne gold", "deck #B08A4F, lightened"],
      ["#B08A4F", "Gold", "deck · img 48 wheels"],
      ["#6F5420", "Bronze", "deck"],
    ],
    stops: ["#3A2A12", "#B08A4F", "#FFF2D6"],
  },
  {
    name: "Rose gold",
    role: "Accent",
    share: "≈ 2% · burgundy theme metal",
    colors: [
      ["#865B48", "Rose bronze", "img 51"],
      ["#B38976", "Rose gold", "img 51"],
      ["#EBC3AE", "Rose highlight", "img 51, lightened"],
    ],
    stops: ["#4A2C22", "#B38976", "#F6DCCD"],
  },
  {
    name: "Iridescent violet",
    role: "Reflection only",
    share: "< 1% · glints inside the liquid-metal artwork",
    colors: [
      ["#6E4C74", "Smoked violet", "img 38"],
      ["#8B52D6", "Prismatic violet", "img 38, picked"],
      ["#2E2C4E", "Indigo marble", "img 45"],
    ],
    stops: ["#1B1430", "#8B52D6", "#E2C8FF"],
  },
];

const FINISHES = ["Matte", "Metallic", "Reflective", "Translucent"] as const;

function finishStyle([d, m, l]: [string, string, string], f: (typeof FINISHES)[number]): CSSProperties {
  switch (f) {
    case "Matte":
      return { background: `var(--grain-img), linear-gradient(160deg, ${m}, ${d})`, backgroundBlendMode: "overlay, normal" };
    case "Metallic":
      return { background: `linear-gradient(100deg, ${d} 0%, ${m} 38%, ${l} 50%, ${m} 62%, ${d} 100%)` };
    case "Reflective":
      return { background: `linear-gradient(180deg, ${l} 0%, ${m} 22%, ${d} 45%, ${l} 52%, ${m} 70%, ${d} 100%)` };
    case "Translucent":
      return { background: `linear-gradient(135deg, ${m}66, ${d}AA), repeating-linear-gradient(45deg, #ffffff10 0 6px, transparent 6px 12px), #111` };
  }
}

const TYPE_ROWS: [string, string, string][] = [
  ["Headings", "Cambria Bold, sentence case, 40 pt; the cover uses 72 pt capitals. Deep forest ink #14241E.", "Caladea Bold (a metric-compatible Cambria) for page titles. Sentence case. Tight leading, slight negative tracking."],
  ["Subtitle voice", "Cambria Italic in emerald #185844: “Is it me or the market?”", "Caladea Italic for the answer line in each title (“Then see the lines.”), coloured by the page material."],
  ["Labels", "Calibri Bold capitals, tracked +1.8 pt, bronze #6F5420, numbered “03 · Proposed solution”.", "Carlito Bold (a metric-compatible Calibri) small capitals, 0.16em tracking, numbered, one per section. Never below 12 px."],
  ["Body", "Calibri 14–17 pt in grey-green #5E6A62 for ledes, #3D4A43 for text.", "Carlito 16 px / 1.65. Ledes at 19 px. Secondary text from each theme's text2."],
  ["Emphasis", "One bronze bold word on light; champagne #F3E0B0 on dark panels.", "The same rule: a single highlighted phrase per block, in the theme's highlight colour."],
  ["Chrome capsules", "Satin-chrome pills with bold dark text for tools and measures.", "Kept for tags and secondary actions only, so they stay special."],
  ["Footer", "Running footer in small capitals with “03 / 12” page numbers.", "A running footer on every page with the page number of the workflow."],
  ["Code (not in deck)", "None.", "IBM Plex Mono for paths, identifiers, line numbers and code. Neutral and highly legible."],
];

export function System() {
  const [demo, setDemo] = useState<ButtonStatus>("idle");
  const [contrastTheme, setContrastTheme] = useState<ThemeId | "all">("all");

  async function runDemo() {
    setDemo("loading");
    await new Promise((r) => window.setTimeout(r, 1100));
    setDemo("success");
    window.setTimeout(() => setDemo("idle"), 1800);
  }

  const themes = contrastTheme === "all" ? THEME_ORDER : [contrastTheme];
  const rows = themes.flatMap((id) => pairings(THEMES[id]).map((p) => ({ theme: THEMES[id].name, ...p, ratio: contrast(p.fg, p.bg) })));
  const failing = rows.filter((r) => r.ratio < r.min).length;

  return (
    <div className="page-inner">
      <PageHead
        n=""
        label="System"
        title={
          <>
            Many metals, <em>one instrument.</em>
          </>
        }
        lede="The colour, material, type and motion system behind the prototype. Colours marked img come from your reference images, deck from your PowerPoint, and derived where I adjusted a reference for contrast."
      />

      <section className="sys-section enter" style={i(3)} aria-labelledby="sys-hier">
        <h2 id="sys-hier" className="h2">
          Hierarchy
        </h2>
        <div className="hier-bar" aria-hidden>
          {FAMILIES.map((f) => (
            <span key={f.name} style={{ flexGrow: parseFloat(f.share.replace(/[^\d.]/g, "")) || 0.6, background: `linear-gradient(180deg, ${f.stops[2]}, ${f.stops[1]} 40%, ${f.stops[0]})` }} title={f.name} />
          ))}
        </div>
        <p className="muted">
          Black titanium carries the structure. Sapphire is the signature and the colour of action. Emerald and burgundy each own one part of the
          workflow. Silver draws the lines. Champagne and rose gold are reserved for small, earned moments, and violet only ever appears as a
          reflection in the artwork.
        </p>
      </section>

      <section className="sys-section" aria-labelledby="sys-pal">
        <h2 id="sys-pal" className="h2">
          Palette and materials
        </h2>
        <div className="families">
          {FAMILIES.map((f, k) => (
            <article key={f.name} className="panel family enter" style={i(k % 4)}>
              <header className="row between wrap gap">
                <h3 className="h4">{f.name}</h3>
                <span className={cx("role-tag", `role-${f.role.split(" ")[0]!.toLowerCase()}`)}>{f.role}</span>
              </header>
              <p className="small muted">{f.share}</p>
              <ul className="swatches">
                {f.colors.map(([hex, name, src]) => (
                  <li key={hex}>
                    <span className="chip-swatch" style={{ background: hex }} aria-hidden />
                    <span className="sw-name">{name}</span>
                    <span className="mono small">{hex}</span>
                    <span className="small muted">{src}</span>
                  </li>
                ))}
              </ul>
              <div className="finishes">
                {FINISHES.map((fin) => (
                  <figure key={fin}>
                    <span className="finish" style={finishStyle(f.stops, fin)} />
                    <figcaption className="small muted">{fin}</figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sys-section" aria-labelledby="sys-themes">
        <h2 id="sys-themes" className="h2">
          Six material themes
        </h2>
        <div className="theme-cards">
          {THEME_ORDER.map((id) => {
            const t = THEMES[id];
            const pages = PAGES.filter((p) => p.theme === id).map((p) => p.label);
            return (
              <article key={id} className={cx("theme-card", `bgpat-${id}`)} style={themeVars(t) as CSSProperties}>
                <p className="eyebrow">{t.name}</p>
                <p className="theme-title">{t.material}</p>
                <p className="small theme-role">{t.role}</p>
                <p className="small theme-pages">Used on: {pages.join(", ")}</p>
                <div className="row gap wrap">
                  <span className="mini-btn">Primary</span>
                  <span className="mini-dot" style={{ background: t.ok }} title="Supported" />
                  <span className="mini-dot" style={{ background: t.bad }} title="Contradicted" />
                  <span className="mini-dot hatch" style={{ background: t.unk }} title="Not verifiable" />
                  <span className="mini-dot" style={{ background: t.warn }} title="Warning" />
                </div>
                <dl className="theme-hex mono">
                  <dt>Page</dt>
                  <dd>{t.bg}</dd>
                  <dt>Panel</dt>
                  <dd>{t.surface}</dd>
                  <dt>Text</dt>
                  <dd>{t.text}</dd>
                  <dt>Label</dt>
                  <dd>{t.eyebrow}</dd>
                  <dt>Accent</dt>
                  <dd>{t.accent}</dd>
                  <dt>Focus</dt>
                  <dd>{t.focus}</dd>
                </dl>
              </article>
            );
          })}
        </div>
        <p className="small muted">
          Status colours are functional and constant: supported, contradicted, not verifiable and warning always carry an icon and a word, and never
          appear as decoration. On ivory they switch to darker values.
        </p>
      </section>

      <section className="sys-section" aria-labelledby="sys-type">
        <h2 id="sys-type" className="h2">
          Typography, from your deck
        </h2>
        <div className="type-specimen panel">
          <p className="eyebrow">
            <span className="eyebrow-n">03</span> · Proposed solution
          </p>
          <p className="h1">Handwave tells you which one it is</p>
          <p className="display-sub small-sub">
            <em>Is it my code or my assumption?</em>
          </p>
          <p className="lede">Every claim is checked against your files. Only quotes that exist are admitted.</p>
          <p>
            Body text at 16 px with <span className="hl">one highlighted phrase</span>, a <span className="mono">src/lib/notes.ts</span> path, and{" "}
            <Capsule>a chrome capsule</Capsule>.
          </p>
        </div>
        <div className="table-wrap">
        <table className="type-table">
          <thead>
            <tr>
              <th scope="col">Element</th>
              <th scope="col">Observed in the deck</th>
              <th scope="col">Decision for Handwave</th>
            </tr>
          </thead>
          <tbody>
            {TYPE_ROWS.map(([el, obs, dec]) => (
              <tr key={el}>
                <th scope="row">{el}</th>
                <td>{obs}</td>
                <td>{dec}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="sys-section" aria-labelledby="sys-btn">
        <h2 id="sys-btn" className="h2">
          Controls and states
        </h2>
        <div className="state-grid panel">
          {(["primary", "chrome", "ghost"] as const).map((v) => (
            <div key={v} className="state-row">
              <span className="eyebrow">{v}</span>
              <Button variant={v}>Default</Button>
              <Button variant={v} force="hover">
                Hover
              </Button>
              <Button variant={v} force="focus">
                Focus
              </Button>
              <Button variant={v} force="pressed">
                Pressed
              </Button>
              <Button variant={v} status="loading">
                Loading
              </Button>
              <Button variant={v} status="success">
                Done
              </Button>
              <Button variant={v} disabled>
                Disabled
              </Button>
            </div>
          ))}
          <div className="state-row">
            <span className="eyebrow">Try it</span>
            <Button status={demo} successLabel="Copied" onClick={() => void runDemo()}>
              <Copy size={15} aria-hidden /> Copy a brief
            </Button>
            <span className="small muted">Press, then watch loading and success. Keyboard: Tab, then Enter.</span>
          </div>
        </div>
        <div className="status-grid">
          <Stamp verdict="SUPPORTED" />
          <Stamp verdict="CONTRADICTED" />
          <Stamp verdict="NOT_VERIFIABLE" />
          <Notice tone="success" title="Success notice" />
          <Notice tone="warn" title="Warning notice">
            Used for limits and partial results.
          </Notice>
          <Notice tone="error" title="Error notice">
            Always says what happened and what to do next.
          </Notice>
        </div>
      </section>

      <section className="sys-section" aria-labelledby="sys-contrast">
        <div className="row between wrap gap">
          <h2 id="sys-contrast" className="h2">
            Contrast, measured
          </h2>
          <label className="field inline">
            <span className="field-label">Theme</span>
            <select value={contrastTheme} onChange={(e) => setContrastTheme(e.target.value as ThemeId | "all")}>
              <option value="all">All six themes</option>
              {THEME_ORDER.map((id) => (
                <option key={id} value={id}>
                  {THEMES[id].name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Notice tone={failing ? "error" : "success"} title={failing ? `${failing} pairing(s) below WCAG AA` : `All ${rows.length} pairings meet WCAG 2.2 AA`}>
          Ratios are computed live from the theme tokens with the WCAG relative-luminance formula. Text needs 4.5:1, focus rings 3:1. Gradient buttons
          are measured at their top, middle and bottom.
        </Notice>
        <div className="table-wrap">
          <table className="contrast-table">
            <thead>
              <tr>
                <th scope="col">Theme</th>
                <th scope="col">Pairing</th>
                <th scope="col">Sample</th>
                <th scope="col">Ratio</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={k}>
                  <td>{r.theme}</td>
                  <td>{r.label}</td>
                  <td>
                    <span className="sample" style={{ color: r.fg, background: r.bg }}>
                      Aa 123
                    </span>
                  </td>
                  <td className="mono">{r.ratio.toFixed(2)}:1</td>
                  <td>
                    {r.ratio >= r.min ? (
                      <span className="v-ok-text">
                        <Check size={14} aria-hidden /> Pass
                      </span>
                    ) : (
                      <span className="v-bad-text">Fail</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sys-section" aria-labelledby="sys-motion">
        <h2 id="sys-motion" className="h2">
          Motion
        </h2>
        <div className="table-wrap">
        <table className="type-table">
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Value</th>
              <th scope="col">Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Instant</th>
              <td className="mono">120 ms · ease-out</td>
              <td>Hover, press, toggles. Never delays an action.</td>
            </tr>
            <tr>
              <th scope="row">State</th>
              <td className="mono">240 ms · cubic-bezier(.2,.7,.1,1)</td>
              <td>Selection, notices, button loading and success.</td>
            </tr>
            <tr>
              <th scope="row">Reveal</th>
              <td className="mono">560 ms subtle / 900 ms cinematic</td>
              <td>Page entrances, staggered 45 ms or 90 ms.</td>
            </tr>
            <tr>
              <th scope="row">Material</th>
              <td className="mono">800 ms · ease</td>
              <td>Theme cross-fades and the artwork's palette change.</td>
            </tr>
            <tr>
              <th scope="row">Signature</th>
              <td className="mono">2.6 s once</td>
              <td>The opening light sweep across the sculpture.</td>
            </tr>
            <tr>
              <th scope="row">Reduced motion</th>
              <td className="mono">0 ms</td>
              <td>Everything appears in place; the artwork renders one still frame.</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p className="small muted">
          <ArrowRight size={13} aria-hidden /> Open the Appearance menu (top right) to switch between subtle and cinematic motion, or preview reduced motion.
        </p>
      </section>
    </div>
  );
}
