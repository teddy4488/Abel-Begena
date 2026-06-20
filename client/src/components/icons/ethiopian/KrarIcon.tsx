import type { CSSProperties } from "react";

type Props = {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Krar Icon — faithful silhouette of the Ethiopian 5/6-string bowl lyre.
 * Two near-vertical wooden arms emerging from a round skin-covered bowl,
 * topped by a short crossbar with visible tuning pegs along its top edge.
 * Closely follows the reference image proportions.
 */
export default function KrarIcon({
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
      {/* Tuning pegs — small protrusions on top of the crossbar */}
      {[19, 24, 29, 34, 39, 44].map((x) => (
        <rect
          key={x}
          x={x - 1}
          y="2"
          width="2"
          height="5"
          fill={color ?? "currentColor"}
        />
      ))}

      {/* Top crossbar */}
      <rect
        x="16"
        y="7"
        width="32"
        height="4"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
        fillOpacity="0.3"
      />

      {/* Two arms — mostly vertical with a very slight outward angle */}
      <line x1="18" y1="11" x2="14" y2="44" strokeWidth="2.5" />
      <line x1="46" y1="11" x2="50" y2="44" strokeWidth="2.5" />

      {/* 6 strings hanging from below the crossbar to the bridge on the bowl */}
      {[20, 24, 28, 32, 36, 40, 44].map((x, i) => {
        const bottomX = 22 + i * 3.2;
        return (
          <line
            key={i}
            x1={x}
            y1="11"
            x2={bottomX}
            y2="52"
            strokeWidth="0.7"
          />
        );
      })}

      {/* Round bowl resonator — clear circle, skin-covered */}
      <ellipse
        cx="32"
        cy="62"
        rx="20"
        ry="14"
        strokeWidth="2"
        fill={color ?? "currentColor"}
        fillOpacity="0.18"
      />

      {/* Bridge — horizontal bar across the top of the bowl */}
      <rect
        x="24"
        y="51"
        width="16"
        height="3"
        strokeWidth="0.8"
        fill={color ?? "currentColor"}
      />

      {/* Small sound hole / decorative dot in the bowl */}
      <circle cx="32" cy="64" r="2.5" strokeWidth="0.8" />
    </svg>
  );
}
