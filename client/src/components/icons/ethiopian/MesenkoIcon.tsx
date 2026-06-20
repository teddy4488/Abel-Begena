import type { CSSProperties } from "react";

type Props = {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Mesenko Icon — faithful silhouette of the Ethiopian single-string spike
 * fiddle (masinko). Cubic wooden resonator shown as a diamond in perspective
 * (skin-covered top + side face), long neck protruding from the top corner,
 * tuning peg perpendicular at the neck end, single string running the length.
 * A small curved bow appears nearby for context.
 */
export default function MesenkoIcon({
  size = 32,
  color,
  className,
  style,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* The diamond-shaped resonator body (perspective view: top + front faces) */}
      {/* Top face (skin-covered) — brighter */}
      <path
        d="M 24 44 L 50 38 L 56 48 L 30 54 Z"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
        fillOpacity="0.12"
      />
      {/* Front face (wooden side) — darker */}
      <path
        d="M 24 44 L 30 54 L 36 76 L 30 66 Z"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
        fillOpacity="0.3"
      />
      {/* Right face — medium */}
      <path
        d="M 50 38 L 56 48 L 62 70 L 56 60 Z"
        strokeWidth="1.5"
        fill={color ?? "currentColor"}
        fillOpacity="0.22"
      />
      {/* Front-bottom edge of body */}
      <line x1="36" y1="76" x2="62" y2="70" strokeWidth="1.5" />
      <line x1="30" y1="54" x2="36" y2="76" strokeWidth="1.5" />
      <line x1="56" y1="48" x2="62" y2="70" strokeWidth="1.5" />

      {/* Triangular bridge sitting on the top face */}
      <polygon
        points="38,46 44,42 42,48"
        fill={color ?? "currentColor"}
      />

      {/* Long neck — extending up and to the right from the top corner of the body */}
      <line x1="50" y1="38" x2="76" y2="14" strokeWidth="2.5" />

      {/* Tuning peg — perpendicular crossbar at the end of the neck */}
      <line x1="73" y1="11" x2="79" y2="17" strokeWidth="2.5" />

      {/* Single string — from peg down along neck and across the body to the bottom corner */}
      <line x1="76" y1="14" x2="44" y2="42" strokeWidth="0.6" />
      <line x1="44" y1="42" x2="36" y2="72" strokeWidth="0.6" />

      {/* Small bow — curved stick lying alongside, separate from the body */}
      <path
        d="M 4 56 Q 14 50 22 58"
        strokeWidth="1.5"
      />
      {/* Bow string */}
      <line x1="4" y1="56" x2="22" y2="58" strokeWidth="0.5" />
    </svg>
  );
}
