"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { assessPassword, getPasswordStrengthDisplay } from "@/lib/password-policy";

interface PasswordStrengthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  confirmValue?: string;
  hint?: string;
  /** When false, hides strength feedback (e.g. current-password or confirm-only fields). */
  showStrength?: boolean;
}

export function PasswordStrengthField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  confirmValue,
  hint,
  showStrength = true,
}: PasswordStrengthFieldProps) {
  const assessment = useMemo(() => assessPassword(value), [value]);
  const strengthLabel = getPasswordStrengthDisplay(assessment.label);
  const feedback = useMemo(() => {
    const messages = [...assessment.messages];
    if (confirmValue !== undefined && confirmValue.length > 0 && confirmValue !== value) {
      messages.push("Passwords do not match.");
    }
    return messages;
  }, [assessment.messages, confirmValue, value]);

  return (
    <FormField id={id} label={label} hint={hint}>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        required
      />
      {value.length > 0 && (showStrength || feedback.length > 0) && (
        <div className="mt-2 space-y-1 text-sm text-[var(--muted)]" aria-live="polite">
          {showStrength && (
            <p>
              Strength: <span className="text-[var(--foreground)]">{strengthLabel}</span>
            </p>
          )}
          {feedback.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </FormField>
  );
}
