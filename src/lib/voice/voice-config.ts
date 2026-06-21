/**
 * Client-readable configuration for on-device voice transcription.
 * Values come from NEXT_PUBLIC_* env vars so they are available in the browser.
 * None of these are secrets; they only select the model and host for weights.
 */

export const DEFAULT_VOICE_MODEL = "Xenova/whisper-base";

function readPublic(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function isVoiceNotesEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_VOICE_NOTES_ENABLED
): boolean {
  // Enabled unless explicitly turned off.
  return readPublic(value) !== "false";
}

export function getVoiceModelId(
  value: string | undefined = process.env.NEXT_PUBLIC_VOICE_MODEL
): string {
  return readPublic(value) ?? DEFAULT_VOICE_MODEL;
}

/** Optional self-hosted base URL for model weights (avoids third-party fetch). */
export function getVoiceModelHost(
  value: string | undefined = process.env.NEXT_PUBLIC_VOICE_MODEL_HOST
): string | undefined {
  return readPublic(value);
}

/**
 * Default third-party origins transformers.js contacts to download model
 * weights and the ONNX-runtime WASM when no self-hosted host is configured.
 * These are content-free (only weights); see `docs/TDR_Local_Voice_Notes.md`.
 */
export const DEFAULT_VOICE_MODEL_CDNS = [
  "https://huggingface.co",
  "https://*.hf.co",
  "https://cdn.jsdelivr.net",
] as const;

/**
 * Network origins the CSP `connect-src` must allow for voice transcription.
 * Empty when voice is disabled; the self-hosted host alone when configured;
 * otherwise the default model CDNs. Used by the Content-Security-Policy.
 */
export function getVoiceModelConnectSources(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  if (!isVoiceNotesEnabled(env.NEXT_PUBLIC_VOICE_NOTES_ENABLED)) return [];
  const host = getVoiceModelHost(env.NEXT_PUBLIC_VOICE_MODEL_HOST);
  if (host) return [host];
  return [...DEFAULT_VOICE_MODEL_CDNS];
}
