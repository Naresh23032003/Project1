"use client";

import { useCallback, useState } from "react";
import { ExtractionSchema, type Extraction } from "@/lib/extract/schema";
import { SAMPLE_EXTRACTION } from "@/lib/sample";
import { turnstileSiteKey } from "./Turnstile";
import { ErrorPanel } from "./ErrorPanel";
import { LoadingScreen } from "./LoadingScreen";
import { Results } from "./Results";
import { ReviewScreen } from "./ReviewScreen";
import { StartScreen } from "./StartScreen";

type View =
  | { name: "start" }
  | { name: "review" }
  | { name: "loading" }
  | { name: "results"; extraction: Extraction; sample: boolean }
  | { name: "error"; title: string; message: string; retry: boolean };

const ERROR_TITLES: Record<string, string> = {
  rate_limited: "That's all for today.",
  not_an_offer: "We couldn't find an offer in that text.",
  too_short: "That text is too short.",
  too_large: "That text is too long.",
  verification_failed: "We couldn't confirm you're a person.",
  not_configured: "Decoding isn't switched on yet.",
};

export function Decoder() {
  const [view, setView] = useState<View>({ name: "start" });
  const [text, setText] = useState("");
  const [lastRequest, setLastRequest] = useState<{ redacted: string; token: string | null } | null>(null);

  const startOver = useCallback(() => {
    setText("");
    setLastRequest(null);
    setView({ name: "start" });
    window.scrollTo({ top: 0 });
  }, []);

  const decode = useCallback(async (redacted: string, token: string | null) => {
    setLastRequest({ redacted, token });
    setView({ name: "loading" });
    window.scrollTo({ top: 0 });
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: redacted, turnstileToken: token ?? undefined }),
      });
      const json = (await res.json().catch(() => null)) as { extraction?: unknown; error?: string; message?: string } | null;
      if (!res.ok || !json?.extraction) {
        const code = json?.error ?? "";
        setView({
          name: "error",
          title: ERROR_TITLES[code] ?? "Something went wrong.",
          message: json?.message ?? "We couldn't read the result. Please try again in a minute.",
          retry: code === "model_unavailable" || code === "invalid_model_output" || code === "" ,
        });
        return;
      }
      const parsed = ExtractionSchema.safeParse(json.extraction);
      if (!parsed.success) {
        setView({ name: "error", title: "We couldn't read the result.", message: "The answer came back in a shape we don't trust, so we're not showing it. Please try again.", retry: true });
        return;
      }
      setView({ name: "results", extraction: parsed.data, sample: false });
    } catch {
      setView({ name: "error", title: "No connection.", message: "We couldn't reach the server. Check your internet and try again.", retry: true });
    }
  }, []);

  switch (view.name) {
    case "start":
      return (
        <StartScreen
          text={text}
          onText={setText}
          onReview={() => {
            setView({ name: "review" });
            window.scrollTo({ top: 0 });
          }}
          onSample={() => {
            setView({ name: "results", extraction: SAMPLE_EXTRACTION, sample: true });
            window.scrollTo({ top: 0 });
          }}
        />
      );
    case "review":
      return <ReviewScreen text={text} onBack={() => setView({ name: "start" })} onDecode={decode} />;
    case "loading":
      return <LoadingScreen />;
    case "results":
      return <Results extraction={view.extraction} sample={view.sample} onStartOver={startOver} />;
    case "error":
      return (
        <ErrorPanel
          title={view.title}
          message={view.message}
          onRetry={view.retry && lastRequest ? () => (turnstileSiteKey ? setView({ name: "review" }) : decode(lastRequest.redacted, lastRequest.token)) : undefined}
          onStartOver={startOver}
        />
      );
  }
}
