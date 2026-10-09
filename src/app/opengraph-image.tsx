import { ImageResponse } from "next/og";

export const alt = "Qahwa House — specialty coffee, poured slowly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card drawn in code: a stoneware cup with steam on a dark espresso ground. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(circle at 78% 55%, #5a2410 0%, #2a1b12 38%, #1a110b 70%)",
          color: "#f2e5cf",
          padding: "72px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: "#e3a53c" }}>
            Specialty coffee · Old Port District
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 108, lineHeight: 1, letterSpacing: -3 }}>Qahwa House</div>
            <div style={{ fontSize: 44, marginTop: 24, color: "#cdb89a" }}>Poured slowly. Shared generously.</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#cdb89a" }}>Concept project — fictional brand.</div>
        </div>
        <svg width="460" height="460" viewBox="0 0 640 640" style={{ position: "absolute", right: 60, top: 90 }}>
          <path d="M285 200c-30-40 30-60 0-105s25-60 5-90" stroke="#f2e5cf" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.35" />
          <path d="M340 205c-25-35 35-55 10-100s20-55 0-80" stroke="#f2e5cf" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.35" />
          <ellipse cx="320" cy="472" rx="258" ry="62" fill="#e9dcc5" />
          <ellipse cx="320" cy="466" rx="160" ry="36" fill="#d2c1a2" />
          <path d="M470 290c70-6 82 70 6 112" fill="none" stroke="#8f3a1b" strokeWidth="26" strokeLinecap="round" />
          <path d="M148 250c4 92 40 170 108 205h128c68-35 104-113 108-205z" fill="#9a3d1c" />
          <ellipse cx="320" cy="250" rx="172" ry="42" fill="#efe3cf" />
          <ellipse cx="320" cy="252" rx="154" ry="33" fill="#a96a3b" />
          <ellipse cx="320" cy="250" rx="60" ry="14" fill="#f4e7d2" />
        </svg>
      </div>
    ),
    size,
  );
}
