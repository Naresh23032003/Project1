import { describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

describe("verifyTurnstile", () => {
  it("skips the check when no secret is set", async () => {
    const f = vi.fn();
    expect(await verifyTurnstile("anything", "1.1.1.1", { secret: undefined, fetchImpl: f as unknown as typeof fetch })).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects a missing token when a secret is set", async () => {
    const f = vi.fn();
    expect(await verifyTurnstile("", "1.1.1.1", { secret: "s", fetchImpl: f as unknown as typeof fetch })).toBe(false);
  });
  it("accepts when Cloudflare says success", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    expect(await verifyTurnstile("tok", "1.1.1.1", { secret: "s", fetchImpl: f as unknown as typeof fetch })).toBe(true);
    const body = (f.mock.calls[0]![1] as { body: URLSearchParams }).body;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
  });
  it("rejects when Cloudflare says no", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    expect(await verifyTurnstile("tok", "1.1.1.1", { secret: "s", fetchImpl: f as unknown as typeof fetch })).toBe(false);
  });
  it("rejects when the verify call fails", async () => {
    const f = vi.fn().mockRejectedValue(new Error("net"));
    expect(await verifyTurnstile("tok", "1.1.1.1", { secret: "s", fetchImpl: f as unknown as typeof fetch })).toBe(false);
  });
});
