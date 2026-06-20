import type { CSSProperties } from "react";

type Props = {
  /** Width of the column in pixels. Default 36. */
  width?: number;
  /** Opacity, 0-1. Default 0.4. */
  opacity?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Vertical Textile Column — decorative side-edge accent (from reference
 * 06-textile-vertical.jpg). Layered black/cream/gold diamonds running
 * vertically. Used as left/right side rules on hero blocks.
 */
export default function VerticalTextileColumn({
  width = 36,
  opacity = 0.4,
  className,
  style,
}: Props) {
  // Note: SVG is embedded as data-URI so the colors stay theme-aware via
  // wood/secondary tokens. Adjust stroke color to the wood token.
  return (
    <div
      className={className}
      style={{
        width,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 80' fill='none'><polygon points='20,8 30,24 20,40 10,24' stroke='%236b3f1b' stroke-width='1.5'/><polygon points='20,40 30,56 20,72 10,56' stroke='%236b3f1b' stroke-width='1.5'/><circle cx='20' cy='24' r='2' fill='%236b3f1b'/><circle cx='20' cy='56' r='2' fill='%236b3f1b'/></svg>\")",
        backgroundSize: `${width}px ${(width * 80) / 40}px`,
        backgroundRepeat: "repeat-y",
        opacity,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
