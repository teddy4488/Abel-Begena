import type { CSSProperties } from "react";

type Props = {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Begena Icon — faithful silhouette of the Ethiopian 10-string lyre.
 * Closely follows the reference image: tall rectangular frame, solid square
 * resonator body at bottom, prominent yoke at top with two end-cap finials,
 * strings fanning down to a central bridge on the body.
 */
export default function BegenaIcon({
  size = 32,
  color,
  className,
  style,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 80"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* End-cap finials — the two solid blocks on the corners of the yoke */}
      <rect x="6" y="2" width="8" height="10" fill={color ?? "currentColor"} />
      <rect x="50" y="2" width="8" height="10" fill={color ?? "currentColor"} />

      {/* Top yoke (crossbar) — fills between the finials */}
      <rect
        x="14"
        y="4"
        width="36"
        height="6"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
        fillOpacity="0.25"
      />

      {/* Two thin side posts running down to the body */}
      <line x1="10" y1="12" x2="10" y2="48" strokeWidth="2" />
      <line x1="54" y1="12" x2="54" y2="48" strokeWidth="2" />

      {/* Strings — 10 of them, fanning slightly inward toward the body bridge */}
      {[16, 20, 24, 28, 30, 34, 36, 40, 44, 48].map((x, i) => {
        const bottomX = 18 + i * 3; // converge to body width
        return (
          <line
            key={i}
            x1={x}
            y1="11"
            x2={bottomX}
            y2="52"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Square resonator body at the bottom — the wooden box */}
      <rect
        x="10"
        y="48"
        width="44"
        height="28"
        strokeWidth="2"
        fill={color ?? "currentColor"}
        fillOpacity="0.18"
      />

      {/* Central bridge / sound box panel — the small dark rectangle inside */}
      <rect
        x="22"
        y="56"
        width="20"
        height="14"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
      />
      {/* Strings continuing into the body (vertical lines) */}
      {[26, 30, 34, 38].map((x) => (
        <line key={x} x1={x} y1="56" x2={x} y2="70" strokeWidth="0.4" stroke="var(--color-background, #fff)" />
      ))}
    </svg>
  );
}
