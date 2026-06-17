import { Alert } from "@/modules/ui/primitives/alert";

interface PrivacyNoticeProps {
  compact?: boolean;
}

export function PrivacyNotice({ compact }: PrivacyNoticeProps) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Your note is protected on this device before it is saved. Our team cannot read your private
        notes.
      </p>
    );
  }

  return (
    <Alert variant="info" title="Your privacy">
      Your private notes are protected on your device before they are saved. Our team does not have
      access to the keys required to read them.
    </Alert>
  );
}
