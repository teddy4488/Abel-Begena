import type { CSSProperties } from "react";

type Props = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * EOTC Ornament — inline decorative divider made of 3 diamonds connected
 * by short lines. Used between sub-sections or as a section opener; sits
 * inline like a typographic flourish.
 */
export default function EOTCOrnament({
  size = 100,
  strokeWidth = 2,
  color,
  className,
  style,
}: Props) {
  const height = (size * 40) / 100;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 40"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <polygon points="20,20 30,8 40,20 30,32" />
      <polygon points="50,20 60,8 70,20 60,32" />
      <polygon points="80,20 90,8 100,20 90,32" />
      <line x1="0" y1="20" x2="20" y2="20" />
      <line x1="40" y1="20" x2="50" y2="20" />
      <line x1="70" y1="20" x2="80" y2="20" />
    </svg>
  );
}
