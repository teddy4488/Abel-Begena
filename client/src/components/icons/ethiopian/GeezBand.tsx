import type { CSSProperties } from "react";

type Props = {
  /** Ge'ez letters to display in the middle row. Default is the first row of the fidel. */
  letters?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Ge'ez Band — section break with Ge'ez letters surrounded by diamond rows.
 * Used at most ONCE per page as a major section divider (like a cathedral nave's
 * stone band). Pattern lifted from reference 08-geez-script-band.jpg.
 */
export default function GeezBand({
  letters = "ሀ ለ ሐ መ ሠ ረ ሰ ቀ በ ተ ኀ ነ አ ከ ወ ዐ",
  className,
  style,
}: Props) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-foreground)",
        color: "var(--color-background)",
        padding: "8px 0",
        borderRadius: 6,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.3)",
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "4px 12px",
          fontSize: 14,
          letterSpacing: "0.6em",
          color: "var(--color-secondary)",
          opacity: 0.85,
        }}
      >
        ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "2px 12px",
          fontFamily: '"Noto Sans Ethiopic", "Nyala", serif',
          fontSize: 18,
          letterSpacing: "0.4em",
        }}
      >
        {letters}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "4px 12px",
          fontSize: 14,
          letterSpacing: "0.6em",
          color: "var(--color-secondary)",
          opacity: 0.85,
        }}
      >
        ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆
      </div>
    </div>
  );
}
