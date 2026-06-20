import type { CSSProperties } from "react";

type Props = {
  /** Width in pixels. Height auto-scales by aspect ratio (240×420 viewBox). */
  size?: number;
  /** Stroke width — the diamond outlines. Default 4. */
  strokeWidth?: number;
  /** Override stroke color. Defaults to currentColor (inherits text color). */
  color?: string;
  className?: string;
  style?: CSSProperties;
  /** Decorative-only — set to true to hide from screen readers. */
  decorative?: boolean;
  title?: string;
};

/**
 * Lalibela Cross — the diamond-lattice Ethiopian Orthodox cross.
 * Modeled on the gold-on-black reference (05-lalibela-cross.jpg).
 *
 * Structure: 9-diamond head rosette + 4 cardinal arm clusters + a 4-tier
 * extended shaft. Renders as gold outlines; pair with a drop-shadow for the
 * "polished gold" feel:
 *   `style={{ filter: "drop-shadow(0 2px 6px rgba(212,164,55,0.4))" }}`
 *
 * Use wherever the codebase currently uses lucide's <Cross /> or a generic
 * religious mark — this reads authentically Ethiopian Orthodox.
 */
export default function LalibelaCross({
  size = 24,
  strokeWidth = 4,
  color,
  className,
  style,
  decorative = true,
  title,
}: Props) {
  const height = (size * 420) / 240;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 240 420"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinejoin="miter"
      className={className}
      style={style}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={!decorative ? (title ?? "Lalibela cross") : undefined}
    >
      {title && !decorative ? <title>{title}</title> : null}
      {/* HEAD ROSETTE — 9 diamonds in a 3x3 arrangement */}
      <rect x="92" y="92" width="56" height="56" transform="rotate(45 120 120)" />
      <rect x="107" y="60" width="26" height="26" transform="rotate(45 120 73)" />
      <rect x="107" y="154" width="26" height="26" transform="rotate(45 120 167)" />
      <rect x="60" y="107" width="26" height="26" transform="rotate(45 73 120)" />
      <rect x="154" y="107" width="26" height="26" transform="rotate(45 167 120)" />
      <rect x="79" y="79" width="18" height="18" transform="rotate(45 88 88)" />
      <rect x="143" y="79" width="18" height="18" transform="rotate(45 152 88)" />
      <rect x="79" y="143" width="18" height="18" transform="rotate(45 88 152)" />
      <rect x="143" y="143" width="18" height="18" transform="rotate(45 152 152)" />
      {/* TOP ARM */}
      <rect x="111" y="33" width="18" height="18" transform="rotate(45 120 42)" />
      <rect x="115" y="13" width="10" height="10" transform="rotate(45 120 18)" />
      {/* LEFT ARM */}
      <rect x="33" y="111" width="18" height="18" transform="rotate(45 42 120)" />
      <rect x="44" y="100" width="12" height="12" transform="rotate(45 50 106)" />
      <rect x="44" y="128" width="12" height="12" transform="rotate(45 50 134)" />
      <rect x="13" y="115" width="10" height="10" transform="rotate(45 18 120)" />
      {/* RIGHT ARM */}
      <rect x="189" y="111" width="18" height="18" transform="rotate(45 198 120)" />
      <rect x="184" y="100" width="12" height="12" transform="rotate(45 190 106)" />
      <rect x="184" y="128" width="12" height="12" transform="rotate(45 190 134)" />
      <rect x="217" y="115" width="10" height="10" transform="rotate(45 222 120)" />
      {/* SHAFT — 4 progressively smaller clusters */}
      <rect x="105" y="194" width="30" height="30" transform="rotate(45 120 209)" />
      <rect x="89" y="200" width="16" height="16" transform="rotate(45 97 208)" />
      <rect x="135" y="200" width="16" height="16" transform="rotate(45 143 208)" />
      <rect x="113" y="178" width="14" height="14" transform="rotate(45 120 185)" />
      <rect x="108" y="250" width="24" height="24" transform="rotate(45 120 262)" />
      <rect x="93" y="256" width="14" height="14" transform="rotate(45 100 263)" />
      <rect x="133" y="256" width="14" height="14" transform="rotate(45 140 263)" />
      <rect x="114" y="235" width="12" height="12" transform="rotate(45 120 241)" />
      <rect x="111" y="300" width="18" height="18" transform="rotate(45 120 309)" />
      <rect x="97" y="305" width="12" height="12" transform="rotate(45 103 311)" />
      <rect x="131" y="305" width="12" height="12" transform="rotate(45 137 311)" />
      <rect x="115" y="287" width="10" height="10" transform="rotate(45 120 292)" />
      <rect x="113" y="338" width="14" height="14" transform="rotate(45 120 345)" />
      <rect x="103" y="343" width="8" height="8" transform="rotate(45 107 347)" />
      <rect x="129" y="343" width="8" height="8" transform="rotate(45 133 347)" />
      <rect x="116" y="375" width="8" height="8" transform="rotate(45 120 379)" />
    </svg>
  );
}
