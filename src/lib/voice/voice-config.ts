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
