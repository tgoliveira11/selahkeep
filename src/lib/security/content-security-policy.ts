import { randomUUID } from "node:crypto";
import { getVoiceModelConnectSources } from "@/lib/voice/voice-config";

/** Fresh nonce per request for Next.js inline scripts (production App Router). */
export function createContentSecurityPolicyNonce(): string {
  return Buffer.from(randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  // On-device voice transcription downloads model weights / ONNX-runtime WASM
  // from a (self-hostable) model host. Audio and transcript never leave the
  // device; only these content-free origins need network access.
  const voiceSources = getVoiceModelConnectSources();
  const connectSrc = ["'self'", ...(isDev ? ["ws:"] : []), ...voiceSources].join(" ");

  const directives = [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `connect-src ${connectSrc}`,
    "img-src 'self' data:",
    // Voice transcription runs Whisper in a Web Worker; ONNX-runtime may spawn
    // helper workers from blob: URLs for WASM threading.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applyContentSecurityPolicy(
  requestHeaders: Headers,
  response: Response,
  nonce: string
): void {
  const policy = buildContentSecurityPolicy(nonce);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  response.headers.set("Content-Security-Policy", policy);
}
