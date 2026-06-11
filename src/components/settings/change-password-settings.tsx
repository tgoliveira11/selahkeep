"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import { accountAuthApi } from "@/lib/api-client/account-auth";
import { ACCOUNT_PASSWORD_VAULT_NOTE } from "@/lib/account-auth-messages";

interface ChangePasswordSettingsProps {
  canChangePassword: boolean;
  authProvider: string;
}

export function ChangePasswordSettings({
  canChangePassword,
  authProvider,
}: ChangePasswordSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canChangePassword) {
    return (
      <p className="text-sm text-[var(--muted)]">
        {authProvider === "credentials"
          ? "Password change is not available for this account."
          : "This account signs in with Google, Apple, or Microsoft. Password change is not available unless you add an email/password sign-in method."}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await accountAuthApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert variant="muted">{ACCOUNT_PASSWORD_VAULT_NOTE}</Alert>
      <FormField id="current-password" label="Current password">
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </FormField>
      <PasswordStrengthField
        id="new-password"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        confirmValue={confirmPassword}
      />
      <PasswordStrengthField
        id="confirm-new-password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        confirmValue={newPassword}
        showStrength={false}
      />
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      {success && <Alert variant="success">{success}</Alert>}
      <Button type="submit" disabled={loading}>
        {loading ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
