import { describe, expect, it } from "vitest";
import { createMemoryLimiter } from "./ratelimit";

describe("memory limiter", () => {
  it("allows up to the limit then blocks", async () => {
    const l = createMemoryLimiter(3, () => 0);
    expect((await l.hit("1.1.1.1")).allowed).toBe(true);
    expect((await l.hit("1.1.1.1")).allowed).toBe(true);
    const third = await l.hit("1.1.1.1");
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect((await l.hit("1.1.1.1")).allowed).toBe(false);
  });
  it("counts each address separately", async () => {
    const l = createMemoryLimiter(1, () => 0);
    await l.hit("1.1.1.1");
    expect((await l.hit("2.2.2.2")).allowed).toBe(true);
  });
  it("resets after a day", async () => {
    let now = 0;
    const l = createMemoryLimiter(1, () => now);
    await l.hit("1.1.1.1");
    expect((await l.hit("1.1.1.1")).allowed).toBe(false);
    now = 24 * 60 * 60 * 1000 + 1;
    expect((await l.hit("1.1.1.1")).allowed).toBe(true);
  });
});
