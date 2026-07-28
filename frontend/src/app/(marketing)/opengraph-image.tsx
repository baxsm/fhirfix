import { ImageResponse } from "next/og";

export const alt = "FHIRfix: turn FHIR conformance errors into a fixable report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#fbfcfd",
        backgroundImage:
          "radial-gradient(60% 60% at 88% 6%, rgba(16,185,129,0.28), rgba(56,189,248,0.12) 45%, transparent 75%), radial-gradient(50% 60% at 6% 12%, rgba(139,92,246,0.14), transparent 70%)",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
        <span style={{ color: "#111827" }}>FHIRfix</span>
        <span style={{ color: "#7c5cff" }}>.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 64,
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            maxWidth: 940,
            fontFamily: "sans-serif",
          }}
        >
          A wall of FHIR conformance errors, turned into a ranked, fixable report.
        </div>
        <div style={{ fontSize: 26, color: "#475569" }}>
          US Core · FHIR R4 · HL7v2 · C-CDA · billed per check
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 22, color: "#64748b" }}>
        Validate → rank → apply safe fixes → re-verify to clean
      </div>
    </div>,
    { ...size },
  );
}
