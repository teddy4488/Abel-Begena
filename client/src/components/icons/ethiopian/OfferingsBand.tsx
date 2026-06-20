import type { CSSProperties } from "react";
import LalibelaCross from "./LalibelaCross";

type Props = {
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Offerings Band — dark hero top-bar with a gilded Lalibela cross,
 * a centred section label, and a gold mosaic tibeb border at the bottom.
 * Replaces InstrumentBand at the top edge of the homepage hero frame.
 */
export default function OfferingsBand({
  label = "OFFERINGS",
  className,
  style,
}: Props) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(to bottom, #1c1000 0%, #0d0800 100%)",
        paddingTop: 18,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Radial glow behind the cross */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 130,
          background: "radial-gradient(ellipse at 50% 40%, rgba(212,164,55,0.45) 0%, rgba(212,164,55,0.12) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Lalibela cross centred at top */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, position: "relative" }}>
        <LalibelaCross
          size={46}
          strokeWidth={4}
          color="#ffd84d"
          style={{ filter: "drop-shadow(0 0 14px rgba(247,201,72,0.85))" }}
        />
      </div>

      {/* Gold checkerboard tibeb border spanning the full width */}
      <div
        style={{
          height: 22,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 22'><rect x='1' y='1' width='9' height='9' fill='%23d4a437'/><rect x='12' y='1' width='9' height='9' fill='none' stroke='%23d4a437' stroke-width='1.5'/><rect x='1' y='12' width='9' height='9' fill='none' stroke='%23d4a437' stroke-width='1.5'/><rect x='12' y='12' width='9' height='9' fill='%23d4a437'/></svg>")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
