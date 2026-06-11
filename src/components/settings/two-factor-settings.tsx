"use client";

import { useEffect, useState } from "react";
import { twoFactorApi } from "@/lib/api-client/two-factor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { SuccessState } from "@/components/ui/success-state";

const CHALLENGE_STORAGE_KEY = "letters-2fa-setup-dismissed";

export function TwoFactorSettings() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualSetupKey, setManualSetupKey] = useState<string | null>(null);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableBackupCode, setDisableBackupCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupSaved, setBackupSaved] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const status = await twoFactorApi.status();
      setEnabled(status.enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load two-factor status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const status = await twoFactorApi.status();
        if (!cancelled) setEnabled(status.enabled);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load two-factor status");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStartSetup() {
    setSetupLoading(true);
    setError(null);
    setSuccess(null);
    setBackupCodes(null);
    setBackupSaved(false);
    setSetupCode("");
    try {
      const setup = await twoFactorApi.startSetup();
      setQrCodeDataUrl(setup.qrCodeDataUrl);
      setManualSetupKey(setup.manualSetupKey);
      setAccountLabel(setup.accountLabel);
      setSetupOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start two-factor setup");
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleVerifySetup() {
    setVerifyLoading(true);
    setError(null);
    try {
      const result = await twoFactorApi.verifySetup({ code: setupCode });
      setEnabled(true);
      setBackupCodes(result.backupCodes);
      setSetupOpen(false);
      setSuccess("Two-factor authentication is now enabled.");
      sessionStorage.setItem(CHALLENGE_STORAGE_KEY, "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid authenticator code");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleDisable() {
    setDisableLoading(true);
    setError(null);
    try {
      await twoFactorApi.disable({
        code: disableCode || undefined,
        backupCode: disableBackupCode || undefined,
      });
      setEnabled(false);
      setDisableOpen(false);
      setDisableCode("");
      setDisableBackupCode("");
      setSuccess("Two-factor authentication has been disabled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable two-factor authentication");
    } finally {
      setDisableLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading two-factor settings" />;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Two-factor authentication</CardTitle>
          <Badge variant={enabled ? "success" : "muted"}>{enabled ? "On" : "Off"}</Badge>
        </div>
        <CardDescription>
          Two-factor authentication adds an extra code when signing in. It protects your account
          access, but it does not replace your private letter recovery code.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {success && <SuccessState message={success} />}
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}

        {enabled ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              Two-factor authentication is enabled for this account.
            </p>
            <Button variant="secondary" onClick={() => setDisableOpen(true)}>
              Disable two-factor authentication
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">
              Add an extra sign-in code from an authenticator app.
            </p>
            <Button onClick={handleStartSetup} disabled={setupLoading}>
              {setupLoading ? "Preparing setup…" : "Set up two-factor authentication"}
            </Button>
          </>
        )}

        {backupCodes && (
          <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4">
            <Alert variant="warning">
              Save these backup codes now. They are shown only once and can each be used a single
              time if you lose access to your authenticator app.
            </Alert>
            <ul className="grid gap-2 font-mono text-sm sm:grid-cols-2">
              {backupCodes.map((code) => (
                <li key={code} className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                  {code}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={backupSaved}
                onChange={(e) => setBackupSaved(e.target.checked)}
                className="mt-1"
              />
              <span>I have saved my backup codes.</span>
            </label>
            <Button
              variant="secondary"
              disabled={!backupSaved}
              onClick={() => setBackupCodes(null)}
            >
              Done
            </Button>
          </div>
        )}
      </div>

      {setupOpen && (
        <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-6">
          <Alert variant="info">
            This protects sign-in only. It does not replace your private letter recovery code.
          </Alert>
          <p className="text-sm text-[var(--muted)]">
            Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password, Authy, or
            another compatible app for <strong>{accountLabel}</strong>.
          </p>
          {qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCodeDataUrl}
              alt="QR code for authenticator app setup"
              className="mx-auto h-52 w-52 rounded border border-[var(--border)] bg-white p-2"
            />
          )}
          {manualSetupKey && (
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Manual setup key
              </p>
              <p className="mt-1 break-all font-mono text-sm">{manualSetupKey}</p>
            </div>
          )}
          <FormField id="setup-totp-code" label="6-digit authenticator code">
            <Input
              id="setup-totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleVerifySetup} disabled={verifyLoading || setupCode.length !== 6}>
              {verifyLoading ? "Verifying…" : "Verify and enable"}
            </Button>
            <Button variant="secondary" onClick={() => setSetupOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={disableOpen}
        title="Disable two-factor authentication?"
        description="Disabling two-factor authentication will remove the extra code required when signing in."
        confirmLabel="Disable 2FA"
        loading={disableLoading}
        onConfirm={handleDisable}
        onCancel={() => setDisableOpen(false)}
      >
        <div className="space-y-3">
          <FormField id="disable-totp-code" label="Current authenticator code">
            <Input
              id="disable-totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </FormField>
          <FormField id="disable-backup-code" label="Or backup code">
            <Input
              id="disable-backup-code"
              autoComplete="off"
              value={disableBackupCode}
              onChange={(e) => setDisableBackupCode(e.target.value)}
            />
          </FormField>
        </div>
      </ConfirmDialog>
    </Card>
  );
}
