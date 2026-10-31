// Short tones generated with Web Audio: no audio files. Velora plays them only after the user has
// turned sound on and then clicked something (the mode switch) or a focus session ends, so the
// browser's autoplay rules are met and nothing ever sounds on page load.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const C = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx ??= new C();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Soft sine notes, each with a short attack and decay so nothing clicks. */
function notes(freqs: number[], gap: number, length: number, level = 0.05) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.01;
  freqs.forEach((f, i) => {
    const osc = a.createOscillator();
    const gain = a.createGain();
    const t = t0 + i * gap;
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  });
}

/** Two notes, about 260 ms in all: rising into Hackathon, falling back into Studio. */
export function playModeTone(to: "studio" | "hackathon") {
  notes(to === "hackathon" ? [659.25, 987.77] : [987.77, 659.25], 0.11, 0.15);
}

/** Three quiet notes, about 290 ms, when a focus session or break ends. */
export function playChime() {
  notes([783.99, 1046.5, 1318.51], 0.09, 0.11, 0.04);
}
