import type { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
};

/**
 * Habesha Wide Strip — vivid red/yellow/green diamond row.
 * Used as the major edge of a section (top of footer, bottom of hero).
 * Uses the `.habesha-wide-strip` global CSS utility.
 */
export default function HabeshaWideStrip({ className, style }: Props) {
  return (
    <div
      className={`habesha-wide-strip ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
