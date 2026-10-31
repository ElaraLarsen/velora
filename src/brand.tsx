
export function VeloraMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="velora-rose-chrome"
          x1="5"
          y1="3"
          x2="25"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFF0F3" />
          <stop offset=".13" stopColor="#E8A6B8" />
          <stop offset=".3" stopColor="#A94E70" />
          <stop offset=".48" stopColor="#F4C4D0" />
          <stop offset=".65" stopColor="#85334F" />
          <stop offset=".84" stopColor="#C97891" />
          <stop offset="1" stopColor="#481B2D" />
        </linearGradient>

        <linearGradient
          id="velora-burgundy-chrome"
          x1="21"
          y1="4"
          x2="34"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFE4EC" />
          <stop offset=".16" stopColor="#C77B95" />
          <stop offset=".34" stopColor="#70263F" />
          <stop offset=".53" stopColor="#391321" />
          <stop offset=".7" stopColor="#9C4563" />
          <stop offset=".86" stopColor="#E6A3B7" />
          <stop offset="1" stopColor="#68243D" />
        </linearGradient>

        <linearGradient
          id="velora-edge-highlight"
          x1="7"
          y1="4"
          x2="19"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".5" stopColor="#FFDCE6" stopOpacity=".65" />
          <stop offset="1" stopColor="#D98BA4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main sculpted V */}
      <path
        d="M3.5 5H11.5L20 25L28.5 5H36.5L23.5 34H16.5L3.5 5Z"
        fill="url(#velora-rose-chrome)"
      />

      {/* Dark, contrasting burgundy metal facet */}
      <path
        d="M20 25L28.5 5H36.5L23.5 34H20V25Z"
        fill="url(#velora-burgundy-chrome)"
      />

      {/* Fine polished outer-edge reflection */}
      <path
        d="M4.7 5.8H10.9L19.6 26.1"
        stroke="url(#velora-edge-highlight)"
        strokeWidth=".85"
        strokeLinecap="round"
      />

      {/* Bright rose-chrome bevel */}
      <path
        d="M20.4 24.2L28.9 5.8H35.1"
        stroke="#FFF0F4"
        strokeOpacity=".9"
        strokeWidth=".65"
        strokeLinecap="round"
      />

      {/* Inner facet reflection */}
      <path
        d="M21.2 26L28.9 8.4"
        stroke="#F2B9CA"
        strokeOpacity=".7"
        strokeWidth=".55"
        strokeLinecap="round"
      />

      {/* Subtle lower-edge glint */}
      <path
        d="M17 33.1H23.1"
        stroke="#F3BDCE"
        strokeOpacity=".65"
        strokeWidth=".6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The header brand. Deliberately not a link: Velora keeps the project in memory only, so
 * navigating to "/" would reload the page and discard the uploaded files and results.
 */
export function VeloraBrand() {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <VeloraMark className="size-10 shrink-0" />

      <span className="flex min-w-0 flex-col justify-center gap-1">
        <span className="font-serif text-[1.55rem] font-bold leading-none tracking-[-0.025em] text-ink">
          Velora
        </span>

        <span
          aria-hidden="true"
          className="hidden border-l border-rule pl-2 font-mono text-[0.58rem] font-[500] uppercase tracking-[0.13em] text-muted min-[768px]:inline-block"
        >
          Ask · Ideate · Build · Verify · Ship
        </span>
      </span>
    </span>
  );
}
