export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  opts: { secret?: string; fetchImpl?: typeof fetch } = { secret: process.env.TURNSTILE_SECRET_KEY },
): Promise<boolean> {
  if (!opts.secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: opts.secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
