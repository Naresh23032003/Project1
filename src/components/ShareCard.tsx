"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { canvasToBlob, drawShareCard, cardHeadline, type ShareCardData } from "@/lib/client/share-card";

const noopSubscribe = () => () => {};

function canShareFiles(): boolean {
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });
}

export function ShareCard({ data }: { data: ShareCardData }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [showAmounts, setShowAmounts] = useState(false);
  const canShare = useSyncExternalStore(noopSubscribe, canShareFiles, () => false);
  const host = typeof window === "undefined" ? "" : window.location.host;

  useEffect(() => {
    if (canvas.current) void drawShareCard(canvas.current, data, host, showAmounts);
  }, [data, host, showAmounts]);

  async function download() {
    if (!canvas.current) return;
    const blob = await canvasToBlob(canvas.current);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-offer-decoded.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    if (!canvas.current) return;
    const blob = await canvasToBlob(canvas.current);
    if (!blob) return;
    try {
      await navigator.share({ files: [new File([blob], "my-offer-decoded.png", { type: "image/png" })], title: "My offer, decoded" });
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <section className="section" aria-labelledby="share-h">
      <h2 id="share-h">Share your decode</h2>
      <p className="muted" style={{ marginTop: "0.5rem" }}>
        An image you can post or send to friends. It doesn&apos;t show any pay figures unless you turn that on.
      </p>
      <figure style={{ margin: "1rem 0 0" }}>
        <canvas ref={canvas} role="img" aria-label={`Share card: My offer, decoded. ${cardHeadline(data)}.`} style={{ width: "100%", height: "auto", aspectRatio: "1200 / 630", border: "1px solid var(--rule)", borderRadius: 6 }} />
      </figure>
      <div className="flex flex-wrap items-center gap-4" style={{ marginTop: "1rem" }}>
        <label className="flex items-center gap-2" style={{ minHeight: 44, cursor: "pointer" }}>
          <input type="checkbox" checked={showAmounts} onChange={(e) => setShowAmounts(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--money)" }} />
          Show my in-hand pay on the card
        </label>
        <button type="button" className="btn btn-primary" onClick={download}>
          Download image
        </button>
        {canShare ? (
          <button type="button" className="btn" onClick={share}>
            Share
          </button>
        ) : null}
      </div>
    </section>
  );
}
