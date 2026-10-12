import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "InHand turns a CTC of 8,40,000 rupees into a monthly in-hand pay of 55,445 rupees";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(pkg: string, file: string) {
  return readFile(path.join(process.cwd(), "node_modules", pkg, "files", file));
}

export default async function Image() {
  const [displayLatin, displayExt, bodyLatin, bodyExt] = await Promise.all([
    font("@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-700-normal.woff"),
    font("@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-ext-700-normal.woff"),
    font("@fontsource/source-sans-3", "source-sans-3-latin-400-normal.woff"),
    font("@fontsource/source-sans-3", "source-sans-3-latin-ext-400-normal.woff"),
  ]);

  const row = (label: string, value: string, first = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: first ? "0" : "1px dashed #c9d3cf", fontSize: 26 }}>
      <span>{label}</span>
      <span style={{ fontFamily: "Bricolage, BricolageExt", fontWeight: 700 }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f2f5f3", color: "#14232b", fontFamily: "Source, SourceExt", position: "relative" }}>
        <div style={{ position: "absolute", left: 72, top: 52, fontSize: 40, fontFamily: "Bricolage, BricolageExt", fontWeight: 700 }}>InHand</div>
        <div style={{ position: "absolute", left: 72, top: 150, width: 640, fontSize: 74, lineHeight: 1.04, fontFamily: "Bricolage, BricolageExt", fontWeight: 700, letterSpacing: -2 }}>
          See what your offer letter really pays.
        </div>
        <div style={{ position: "absolute", left: 72, bottom: 52, fontSize: 30, color: "#46585f" }}>Free. Private. Your file never leaves your browser.</div>
        <div style={{ position: "absolute", right: 72, top: 96, width: 400, display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #c9d3cf", borderRadius: 8, padding: "32px 36px" }}>
          {row("CTC, per month", "₹70,000", true)}
          {row("Not in monthly pay", "−₹11,347")}
          {row("PF and prof. tax", "−₹3,208")}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 8, paddingTop: 16, paddingBottom: 12, borderTop: "2px solid #14232b" }}>
            <span style={{ fontSize: 24, color: "#46585f" }}>You&apos;ll take home about</span>
            <span style={{ fontSize: 80, lineHeight: 1, color: "#0a6b50", fontFamily: "Bricolage, BricolageExt", fontWeight: 700, letterSpacing: -2, marginTop: 6 }}>{"₹55,445"}</span>
            <span style={{ fontSize: 24, color: "#46585f" }}>a month</span>
          </div>
          <div style={{ display: "flex", height: 2, background: "#14232b" }} />
          <div style={{ display: "flex", height: 2, background: "#14232b", marginTop: 3 }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: displayLatin, weight: 700, style: "normal" },
        { name: "BricolageExt", data: displayExt, weight: 700, style: "normal" },
        { name: "Source", data: bodyLatin, weight: 400, style: "normal" },
        { name: "SourceExt", data: bodyExt, weight: 400, style: "normal" },
      ],
    },
  );
}
