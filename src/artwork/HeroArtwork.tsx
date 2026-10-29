import { useEffect, useRef, useState } from "react";
import { cx } from "../ui";
import { startLiquid, type Liquid } from "./liquid";
import { SCULPTURES, type MaterialId } from "./materials";

const REDUCED = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const m = window.matchMedia(REDUCED);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * The step's metal sculpture, drawn behind the interface (see liquid.ts). Purely decorative:
 * hidden from assistive technology and never takes pointer input. Without WebGL a CSS
 * rendering of the same material takes its place.
 */
export function HeroArtwork({ material }: { material: MaterialId }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const liquid = useRef<Liquid | null>(null);
  const [webgl, setWebgl] = useState(true);
  const reduced = useReducedMotion();

  // Created once; the effects below push every later change into it.
  useEffect(() => {
    const l = canvas.current ? startLiquid(canvas.current, window.matchMedia(REDUCED).matches) : null;
    liquid.current = l;
    setWebgl(!!l);
    if (l) {
      l.setMaterial(SCULPTURES[material], true);
      l.state.layout = 1; // the page-header composition: top right, above the content
    }
    return () => {
      l?.destroy();
      liquid.current = null;
    };
    // Created once on mount; `material` is applied by the effect below on every change.
  }, []);

  useEffect(() => {
    const l = liquid.current;
    if (!l) return;
    l.state.live = !reduced;
    l.state.pointer = !reduced;
    l.state.energy = 1;
    if (reduced) l.state.intro = 1;
  }, [reduced, webgl]);

  // The sculpture recedes as the page scrolls, so content below the heading reads on calm ground.
  useEffect(() => {
    const onScroll = () => {
      const l = liquid.current;
      if (l) l.state.fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.55));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [webgl]);

  // A sheet of light marks each change of step.
  const first = useRef(true);
  useEffect(() => {
    const l = liquid.current;
    if (!l) return;
    l.setMaterial(SCULPTURES[material], reduced);
    if (first.current) first.current = false;
    else l.sweep();
  }, [material, reduced, webgl]);

  return (
    <>
      <canvas ref={canvas} className={cx("hw-artwork", webgl && "is-on")} aria-hidden="true" />
      {!webgl && <div className="hw-artwork-fallback" aria-hidden="true" />}
    </>
  );
}
