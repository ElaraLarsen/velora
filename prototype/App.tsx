import { Menu, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CheckedVerdict, SourceFile } from "../shared/types";
import { SAMPLE_EXPLANATION } from "../shared/sample";
import { CLAIMS, CONTEXT, FILES, checkClaims, type DemoClaim } from "./data";
import { startLiquid, type Liquid } from "./liquid";
import { Circle } from "./pages/Circle";
import { Claims } from "./pages/Claims";
import { Evidence } from "./pages/Evidence";
import { Explain } from "./pages/Explain";
import { Instrument } from "./pages/Instrument";
import { Load } from "./pages/Load";
import { Prove } from "./pages/Prove";
import { System } from "./pages/System";
import { PAGES, SessionContext, WORKFLOW, type Motion, type PageId, type Ruling, type Session } from "./state";
import { CIRCLE_MATERIAL, THEME_ORDER, THEMES, themeVars, type ThemeId } from "./themes";
import { cx } from "./ui";

type TypeSet = "deck" | "refined";

function pageFromHash(): PageId {
  const id = window.location.hash.replace(/^#\/?/, "") as PageId;
  return PAGES.some((p) => p.id === id) ? id : "instrument";
}

function useSystemReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

/** One delegated listener: magnetic pull on primary buttons, and the pointer-tracked sheen on panels. */
function usePointerMaterial(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;
    let magnet: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const panel = t?.closest<HTMLElement>(".panel");
      if (panel) {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty("--px", `${e.clientX - r.left}px`);
        panel.style.setProperty("--py", `${e.clientY - r.top}px`);
      }
      const m = t?.closest<HTMLElement>("[data-magnetic]");
      if (magnet && magnet !== m) {
        magnet.style.translate = "";
        magnet = null;
      }
      if (m && !(m as HTMLButtonElement).disabled) {
        const r = m.getBoundingClientRect();
        const clamp = (v: number) => Math.max(-4, Math.min(4, v));
        m.style.translate = `${clamp((e.clientX - (r.left + r.width / 2)) * 0.12)}px ${clamp((e.clientY - (r.top + r.height / 2)) * 0.25)}px`;
        m.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        m.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        magnet = m;
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, [enabled]);
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <fieldset className="seg-field">
      <legend className="eyebrow">{label}</legend>
      <div className="seg">
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} className={cx(value === v && "is-on")} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function App() {
  const systemReduced = useSystemReducedMotion();
  const [reducedPreview, setReducedPreview] = useState(false);
  const reduced = systemReduced || reducedPreview;
  const [motion, setMotion] = useState<Motion>("cinematic");
  const [typeSet, setTypeSet] = useState<TypeSet>("deck");
  const [override, setOverride] = useState<ThemeId | "auto">("auto");
  const [live, setLive] = useState(true);
  const [pointer, setPointer] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [introKey, setIntroKey] = useState(0);
  const liquid = useRef<Liquid | null>(null);

  const [page, setPage] = useState<PageId>(pageFromHash);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const mainRef = useRef<HTMLElement>(null);

  // Session data. `?filled` starts with the whole sample session, for review.
  const filled = new URLSearchParams(window.location.search).has("filled");
  const [files, setFilesState] = useState<SourceFile[]>(() => (filled ? FILES : []));
  const [usingSample, setUsingSample] = useState(filled);
  const [context, setContext] = useState(() => (filled ? CONTEXT : ""));
  const [card, setCard] = useState("failure");
  const [explanation, setExplanation] = useState(() => (filled ? SAMPLE_EXPLANATION : ""));
  const [claims, setClaims] = useState<DemoClaim[] | null>(() => (filled ? CLAIMS : null));
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set(CLAIMS.map((c) => c.id)));
  const [verdicts, setVerdicts] = useState<CheckedVerdict[] | null>(() => (filled ? checkClaims(CLAIMS) : null));
  const [selected, setSelected] = useState<string | null>(() => (filled ? "c2" : null));
  const [rulings, setRulings] = useState<Record<string, Ruling>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const pageDef = PAGES.find((p) => p.id === page)!;
  const themeId: ThemeId = override === "auto" ? pageDef.theme : override;
  const theme = THEMES[themeId];
  // Circle keeps the burgundy page colours but has its own violet/magenta metal.
  const isCircleMetal = override === "auto" && page === "circle";
  const material = isCircleMetal ? CIRCLE_MATERIAL : theme.sculpture;
  const materialId = isCircleMetal ? "circle" : themeId;

  const go = useCallback(
    (next: PageId) => {
      setMenuOpen(false);
      if (next === page) return;
      const swap = () => {
        window.history.pushState(null, "", `#/${next}`);
        setPage(next);
        setPhase("in");
        window.scrollTo({ top: 0, behavior: "auto" });
        window.setTimeout(() => mainRef.current?.focus({ preventScroll: true }), 0);
      };
      if (reduced) return swap();
      setPhase("out");
      window.setTimeout(swap, motion === "cinematic" ? 260 : 160);
    },
    [page, reduced, motion],
  );

  // Popovers close on Escape or a click elsewhere.
  useEffect(() => {
    if (!panelOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setMenuOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (panelOpen && !t.closest(".appearance")) setPanelOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [panelOpen, menuOpen]);

  useEffect(() => {
    const onPop = () => setPage(pageFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // The artwork: created once, then fed settings and the active palette.
  useEffect(() => {
    const l = startLiquid(document.getElementById("liquid") as HTMLCanvasElement, reduced);
    liquid.current = l;
    setWebgl(!!l);
    if (l) {
      l.setMaterial(material, true);
      l.state.layout = page === "instrument" ? 0 : 1;
    }
    return () => l?.destroy();
    // Created once on mount; the effects below push every later change into it.
  }, []);

  // The sculpture recedes as a page scrolls, so content below the header reads on calm surfaces.
  useEffect(() => {
    const onScroll = () => {
      const l = liquid.current;
      if (!l) return;
      const span = window.innerHeight * (page === "instrument" ? 0.9 : 0.55);
      l.state.fade = Math.max(0, 1 - window.scrollY / span);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  useEffect(() => {
    const l = liquid.current;
    if (!l) return;
    l.state.live = live && !reduced;
    l.state.pointer = pointer && !reduced;
    l.state.energy = motion === "cinematic" ? 1 : 0.6;
    if (reduced) l.state.intro = 1;
  }, [live, pointer, motion, reduced]);

  // Material and composition follow the page; a sheet of light marks each change of material.
  const firstMaterial = useRef(true);
  useEffect(() => {
    document.getElementById("liquid")?.classList.add("is-on");
    const l = liquid.current;
    if (!l) return;
    l.setMaterial(material, reduced);
    l.state.layout = page === "instrument" ? 0 : 1;
    if (firstMaterial.current) firstMaterial.current = false;
    else l.sweep();
  }, [material, page, reduced]);

  usePointerMaterial(!reduced);

  function fillSession() {
    setFilesState(FILES);
    setUsingSample(true);
    setContext(CONTEXT);
    setExplanation(SAMPLE_EXPLANATION);
    setClaims(CLAIMS);
    setConfirmed(new Set(CLAIMS.map((c) => c.id)));
    setVerdicts(checkClaims(CLAIMS));
    setSelected("c2");
    setRulings({});
    setPanelOpen(false);
  }

  function resetSession() {
    setFilesState([]);
    setUsingSample(false);
    setContext("");
    setExplanation("");
    setClaims(null);
    setConfirmed(new Set(CLAIMS.map((c) => c.id)));
    setVerdicts(null);
    setSelected(null);
    setRulings({});
    setNotes({});
    setPanelOpen(false);
  }

  const replayIntro = useCallback(() => {
    if (page !== "instrument") go("instrument");
    setIntroKey((k) => k + 1);
    if (!reduced) liquid.current?.replayIntro();
  }, [page, go, reduced]);

  const session: Session = useMemo(
    () => ({
      go,
      motion,
      reduced,
      replayIntro,
      files,
      usingSample,
      setFiles: (f, sample) => {
        setFilesState(f);
        setUsingSample(sample);
      },
      context,
      setContext,
      card,
      setCard,
      explanation,
      setExplanation,
      claims,
      setClaims,
      confirmed,
      toggleConfirmed: (id) =>
        setConfirmed((prev) => {
          const n = new Set(prev);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
      verdicts,
      setVerdicts: (v) => {
        setVerdicts(v);
        setRulings({});
      },
      selected,
      setSelected,
      rulings,
      setRuling: (id, r) => setRulings((p) => ({ ...p, [id]: r })),
      notes,
      setNote: (id, t) => setNotes((p) => ({ ...p, [id]: t })),
    }),
    [go, motion, reduced, replayIntro, files, usingSample, context, card, explanation, claims, confirmed, verdicts, selected, rulings, notes],
  );

  const status: Partial<Record<PageId, string>> = {
    load: files.length ? `${files.length} files` : "empty",
    explain: explanation ? `${explanation.trim().split(/\s+/).length} words` : "—",
    claims: claims ? `${confirmed.size} confirmed` : "—",
    evidence: verdicts ? `${verdicts.filter((v) => v.verdict === "CONTRADICTED").length} contradicted` : "dark",
    prove: verdicts ? `${Object.keys(rulings).length} ruled` : "—",
    circle: "concept",
  };

  const stepIndex = WORKFLOW.findIndex((p) => p.id === page);
  const PageView = { instrument: Instrument, load: Load, explain: Explain, claims: Claims, evidence: Evidence, prove: Prove, circle: Circle, system: System }[page];

  const nav = (
    <ol className="nav-list" aria-label="Pages">
      {PAGES.map((p) => (
        <li key={p.id} className={cx(p.group !== "workflow" && "nav-sep")}>
          <a
            href={`#/${p.id}`}
            aria-current={p.id === page ? "page" : undefined}
            className={cx("nav-item", p.id === page && "is-active")}
            onClick={(e) => {
              e.preventDefault();
              go(p.id);
            }}
          >
            <span className={`swatch swatch-${p.theme}`} aria-hidden />
            <span className="nav-n mono">{p.n}</span>
            <span className="nav-label">{p.label}</span>
            {status[p.id] && <span className="nav-status mono">{status[p.id]}</span>}
          </a>
        </li>
      ))}
    </ol>
  );

  // A direct route through the six materials, plus replays of the two signature animations.
  const tour = (
    <div className="tour">
      <p className="eyebrow">Materials</p>
      <div className="tour-swatches">
        {THEME_ORDER.map((id) => {
          const target = PAGES.find((p) => p.theme === id)!;
          return (
            <button
              key={id}
              type="button"
              className={cx("tour-swatch", id === themeId && "is-on")}
              aria-label={`${THEMES[id].name}: open ${target.label}`}
              title={`${THEMES[id].name} · ${target.label}`}
              onClick={() => {
                setOverride("auto");
                go(target.id);
              }}
            >
              <span className={`swatch swatch-${id}`} aria-hidden />
            </button>
          );
        })}
      </div>
      <p className="tour-name small">{theme.name}</p>
      <div className="tour-actions">
        <button type="button" className="btn btn-ghost btn-s" onClick={replayIntro}>
          <span className="btn-face">
            <RotateCcw size={13} aria-hidden /> Opening
          </span>
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={() => liquid.current?.sweep()} disabled={!webgl || reduced}>
          <span className="btn-face">Light sweep</span>
        </button>
      </div>
      <p className="small muted">Design prototype · illustrative data</p>
    </div>
  );

  return (
    <SessionContext.Provider value={session}>
      <div
        className="proto"
        data-theme={themeId}
        data-material={materialId}
        data-page={page}
        data-motion={motion}
        data-type={typeSet}
        data-reduced={reduced ? "true" : "false"}
        style={themeVars(theme) as CSSProperties}
      >
        <a href="#main" className="skip">
          Skip to content
        </a>
        <div className="backdrop" aria-hidden>
          {THEME_ORDER.map((id) => (
            <div key={id} className={cx("bgpat", `bgpat-${id}`, id === themeId && "is-on")} />
          ))}
        </div>
        {!webgl && <div className={cx("liquid-fallback", page !== "instrument" && "is-page")} aria-hidden />}

        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label="Open pages menu" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
          <a
            className="brand"
            href="#/instrument"
            onClick={(e) => {
              e.preventDefault();
              go("instrument");
            }}
          >
            <span className="brand-mark" aria-hidden />
            Handwave
          </a>
          <span className="topbar-page">
            <span className="mono">{pageDef.n}</span> {pageDef.label}
          </span>
          <div className="appearance">
            <button type="button" className="appearance-btn" aria-expanded={panelOpen} aria-controls="appearance-panel" onClick={() => setPanelOpen((o) => !o)}>
              <SlidersHorizontal size={16} aria-hidden /> <span>Appearance</span>
            </button>
            <div id="appearance-panel" className="appearance-panel" hidden={!panelOpen}>
              <fieldset className="seg-field">
                <legend className="eyebrow">Material</legend>
                <div className="theme-picks">
                  <button type="button" aria-pressed={override === "auto"} className={cx("theme-pick", override === "auto" && "is-on")} onClick={() => setOverride("auto")}>
                    <span className="swatch swatch-auto" aria-hidden /> Per page <span className="small muted">recommended</span>
                  </button>
                  {THEME_ORDER.map((id) => (
                    <button key={id} type="button" aria-pressed={override === id} className={cx("theme-pick", override === id && "is-on")} onClick={() => setOverride(id)}>
                      <span className={`swatch swatch-${id}`} aria-hidden /> {THEMES[id].name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Seg label="Typefaces" value={typeSet} onChange={setTypeSet} options={[["deck", "From the deck"], ["refined", "Refined"]]} />
              <Seg label="Motion" value={motion} onChange={setMotion} options={[["subtle", "Subtle"], ["cinematic", "Cinematic"]]} />
              <Seg label="Artwork" value={live ? "live" : "still"} onChange={(v) => setLive(v === "live")} options={[["live", "Live"], ["still", "Still"]]} />
              <label className="check">
                <input type="checkbox" checked={pointer} onChange={(e) => setPointer(e.target.checked)} disabled={!webgl} /> Pointer moves the light
              </label>
              <label className="check">
                <input type="checkbox" checked={reducedPreview} onChange={(e) => setReducedPreview(e.target.checked)} /> Preview reduced motion
              </label>
              <p className="small muted">
                {typeSet === "deck" ? "Caladea + Carlito: open-licence twins of the deck's Cambria and Calibri." : "Source Serif 4 + Source Sans 3: the same structure, finer details."}{" "}
                System reduced motion: {systemReduced ? "on" : "off"}. Artwork: {webgl ? "WebGL shader" : "CSS fallback"}.
              </p>
              <div className="row wrap gap-s">
                <button type="button" className="btn btn-chrome" onClick={fillSession}>
                  <span className="btn-face">Fill with the sample session</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetSession}>
                  <span className="btn-face">Reset</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={replayIntro}>
                  <span className="btn-face">
                    <RotateCcw size={14} aria-hidden /> Replay opening
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="rail" aria-label="Pages">
          {nav}
          {tour}
        </nav>
        <div id="mobile-nav" className={cx("mobile-nav", menuOpen && "is-open")} hidden={!menuOpen}>
          {nav}
          {tour}
        </div>

        <main id="main" ref={mainRef} tabIndex={-1} className={cx("main", `phase-${phase}`)} key={`${page}-${page === "instrument" ? introKey : 0}`}>
          <PageView />
          <footer className="running-footer">
            <span>Handwave · design prototype · illustrative data</span>
            <span className="mono">{stepIndex >= 0 ? `${String(stepIndex + 1).padStart(2, "0")} / ${String(WORKFLOW.length).padStart(2, "0")}` : pageDef.label}</span>
          </footer>
        </main>
      </div>
    </SessionContext.Provider>
  );
}
