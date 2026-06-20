import type { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
  /** 0 to 1. Default 0.5. */
  opacity?: number;
  /** Vertical margin in px. Default 24 each side. */
  my?: number;
};

/**
 * Habesha Thread — thin gold/wood diamond strip.
 * Drop-in replacement for `<hr>` on public-facing pages.
 *
 * Uses the `.habesha-thread` global utility (pure CSS, no SVG payload).
 */
export default function HabeshaThread({ className, style, opacity, my }: Props) {
  return (
    <div
      className={`habesha-thread ${className ?? ""}`}
      style={{
        opacity: opacity ?? undefined,
        marginTop: my,
        marginBottom: my,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
