/** Best-effort client IP for rate limiting. Forwarded headers are trusted only when explicitly enabled. */
export function getClientIp(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  const trustForwarded = env.AUTH_TRUST_FORWARDED_HEADERS === "true";

  if (trustForwarded) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  return "unknown-ip";
}
