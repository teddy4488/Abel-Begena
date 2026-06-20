import type { CSSProperties } from "react";
import BegenaIcon from "./BegenaIcon";
import KrarIcon from "./KrarIcon";
import MesenkoIcon from "./MesenkoIcon";

type Props = {
  /** Pixel size for each instrument icon. Default 28. */
  iconSize?: number;
  /** How many instrument groups (3 instruments per group) to repeat. Default 5. */
  groups?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Instrument Band — section break with the three Ethiopian instruments
 * (Begena, Krar, Mesenko) repeating between two rows of diamonds.
 *
 * Replaces GeezBand in the hero — the letters were too literal a reference;
 * the instruments are the actual subject matter of the conservatory.
 */
export default function InstrumentBand({
  iconSize = 28,
  groups = 5,
  className,
  style,
}: Props) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-foreground)",
        color: "var(--color-background)",
        padding: "10px 0",
        borderRadius: 6,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.3)",
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Top diamond row */}
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

      {/* Instrument row — Begena / Krar / Mesenko, repeated */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "6px 24px",
          color: "var(--color-secondary)",
        }}
      >
        {Array.from({ length: groups }).flatMap((_, gi) => [
          <BegenaIcon key={`begena-${gi}`} size={iconSize} />,
          <KrarIcon key={`krar-${gi}`} size={iconSize} />,
          <MesenkoIcon key={`mesenko-${gi}`} size={iconSize} />,
        ])}
      </div>

      {/* Bottom diamond row (mirror of top) */}
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
