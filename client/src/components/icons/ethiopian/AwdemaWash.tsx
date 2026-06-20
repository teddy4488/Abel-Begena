import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Awdema Wash — wrapper that applies a low-opacity Ethiopian geometric
 * background pattern (lifted from reference 04-awdema-mark.jpg).
 *
 * The pattern sits BEHIND the content via `.awdema-bg::before`. Use on hero
 * sections, footers, or any block that needs subtle visual texture.
 */
export default function AwdemaWash({ children, className, style }: Props) {
  return (
    <div className={`awdema-bg ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
