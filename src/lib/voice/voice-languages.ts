/**
 * Languages supported for on-device voice transcription.
 * Codes match Whisper language ids. See `docs/TDR_Local_Voice_Notes.md`.
 */
export const VOICE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
] as const;

export type VoiceLanguageCode = (typeof VOICE_LANGUAGES)[number]["code"];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "en";

export function isSupportedVoiceLanguage(value: string): value is VoiceLanguageCode {
  return VOICE_LANGUAGES.some((lang) => lang.code === value);
}

/** Coerce any input to a supported language, falling back to the default. */
export function normalizeVoiceLanguage(value: string | null | undefined): VoiceLanguageCode {
  if (value && isSupportedVoiceLanguage(value)) return value;
  return DEFAULT_VOICE_LANGUAGE;
}

export function voiceLanguageLabel(code: VoiceLanguageCode): string {
  return VOICE_LANGUAGES.find((lang) => lang.code === code)?.label ?? code;
}
