export function PrismMonogram() {
  return (
    <g className="logo-prism-monogram">
      {/* Top Diamond / Apex facet */}
      <polygon
        points="16,3 20,11 16,16 12,11"
        className="fill-primary-400"
      />
      {/* Upper Left Apex Shadow */}
      <polygon
        points="16,3 12,11 16,16 16,13"
        className="fill-primary-600"
        opacity="0.9"
      />
      {/* Left Main Leg */}
      <polygon
        points="12,11 4,27 10,27 16,16"
        className="fill-primary-600"
      />
      {/* Right Main Leg */}
      <polygon
        points="20,11 28,27 22,27 16,16"
        className="fill-primary-500"
      />
      {/* Crossbar / Horizontal Prism Bridge */}
      <polygon
        points="8.5,19 23.5,19 21,24 11,24"
        className="fill-primary-400"
      />
      {/* Inner Central Core Facet */}
      <polygon
        points="16,13 13,19 19,19"
        className="fill-primary-700"
      />
    </g>
  );
}

export function WordmarkText({ x = 0 }: { x?: number }) {
  return (
    <g transform={"translate(" + x + ", 0)"} className="logo-wordmark">
      <text
        x="0"
        y="22"
        className="fill-foreground font-extrabold tracking-wider"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="15"
        fontWeight="800"
        letterSpacing="0.08em"
      >
        ACCIVA
        <tspan
          dx="6"
          fontWeight="600"
          className="fill-primary-500"
        >
          UI
        </tspan>
      </text>
    </g>
  );
}
