import { Volume2, VolumeX } from "lucide-react";
import { focus, useSound } from "../focus/focusStore";
import type { Mode } from "../project/types";
import { cx } from "../ui";

const MODES: { id: Mode; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "hackathon", label: "Hackathon" },
];

/** Studio | Hackathon. Switching changes only the view; the project is shared by both modes. */
export function ModeSwitch({ mode, onMode, wide = false }: { mode: Mode; onMode: (m: Mode) => void; wide?: boolean }) {
  return (
    <div role="group" aria-label="Mode" className={cx("hw-mode inline-flex rounded-full p-[3px]", wide && "flex w-full")}>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => mode !== m.id && onMode(m.id)}
          className={cx(
            "min-h-9 rounded-full px-4 text-sm font-medium transition-colors",
            wide && "flex-1",
            mode === m.id ? "hw-mode-on" : "text-muted hover:text-ink",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Speaker for the mode-switch tone. Off until the user turns it on; the choice is remembered in this browser. */
export function SoundToggle() {
  const on = useSound();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Sound when switching modes"
      title={on ? "Mode-switch sound on" : "Mode-switch sound off"}
      onClick={() => focus.setSound(!on)}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink aria-pressed:text-ink-2"
    >
      {on ? <Volume2 aria-hidden className="size-4" /> : <VolumeX aria-hidden className="size-4" />}
    </button>
  );
}
