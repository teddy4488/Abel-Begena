import type { CSSProperties } from "react";

type Props = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
  title?: string;
};

/**
 * Begena Glyph — silhouette of the 10-string Ethiopian harp.
 * Modeled on the official Abel Begena mark.
 *
 * Structure: yoke (top crossbar) → tuning pegs hanging below → thin side
 * posts → 10 strings → resonator box at the bottom with an inner panel
 * (where "አቤል" sits in the actual logo).
 *
 * Use as a brand glyph or section accent. Aspect ratio is 80×110.
 */
export default function BegenaGlyph({
  size = 32,
  strokeWidth = 1.5,
  color,
  className,
  style,
  decorative = true,
  title,
}: Props) {
  const height = (size * 110) / 80;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 80 110"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinejoin="miter"
      strokeLinecap="square"
      className={className}
      style={style}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={!decorative ? (title ?? "Begena harp") : undefined}
    >
      {title && !decorative ? <title>{title}</title> : null}
      {/* Yoke (top crossbar) */}
      <rect
        x="3"
        y="6"
        width="74"
        height="10"
        strokeWidth={Math.max(strokeWidth, 2)}
        fill={color ?? "currentColor"}
        fillOpacity="0.1"
      />
      <line x1="6" y1="11" x2="74" y2="11" strokeWidth="0.5" strokeOpacity="0.4" />
      {/* Tuning pegs hanging from yoke */}
      {[9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69].map((x) => (
        <line key={`peg-${x}`} x1={x} y1="16" x2={x} y2="22" />
      ))}
      {/* Side posts */}
      <line x1="4" y1="16" x2="4" y2="84" strokeWidth={Math.max(strokeWidth, 2)} />
      <line x1="76" y1="16" x2="76" y2="84" strokeWidth={Math.max(strokeWidth, 2)} />
      {/* 10 strings */}
      {[11, 18, 24, 30, 36, 42, 48, 54, 60, 68].map((x) => (
        <line key={`string-${x}`} x1={x} y1="22" x2={x} y2="84" />
      ))}
      {/* Resonator box */}
      <rect
        x="3"
        y="84"
        width="74"
        height="20"
        strokeWidth={Math.max(strokeWidth, 2)}
        fill={color ?? "currentColor"}
        fillOpacity="0.1"
      />
      {/* Inner decorative panel on resonator */}
      <rect x="20" y="89" width="40" height="10" strokeWidth="1" rx="1" />
    </svg>
  );
}
