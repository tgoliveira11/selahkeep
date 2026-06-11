import { Alert } from "@/components/ui/alert";

interface PrivacyNoticeProps {
  compact?: boolean;
}

export function PrivacyNotice({ compact }: PrivacyNoticeProps) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Your letter is protected on this device before it is saved. Our team cannot read your private
        letters.
      </p>
    );
  }

  return (
    <Alert variant="info" title="Your privacy">
      Your private letters are protected on your device before they are saved. Our team does not have
      access to the keys required to read them.
    </Alert>
  );
}
