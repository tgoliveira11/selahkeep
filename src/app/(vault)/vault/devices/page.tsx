"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  trustedDevicesApi,
  type TrustedDeviceResponse,
  type ClientDeviceState,
} from "@/lib/api-client/trusted-devices";
import { getOrCreateDeviceSecret } from "@/lib/crypto-client/device-storage";
import { getSessionVaultKey, wrapVaultKeyForDevice, clearVaultClientState } from "@/lib/crypto-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { getDeviceDisplayInfo, formatDeviceMetadataSubtitle } from "@/lib/device-display-info";
import {
  findActiveDeviceWithMatchingMetadata,
  isCurrentTrustedDevice,
} from "@/lib/trusted-device-utils";

async function relinkBrowserToDevice(
  userId: string,
  device: TrustedDeviceResponse,
  displayInfo: ReturnType<typeof getDeviceDisplayInfo>
): Promise<{ device: TrustedDeviceResponse; deviceId: string }> {
  const vaultKey = getSessionVaultKey();
  if (!vaultKey) {
    throw new Error("Unlock your vault before linking this browser.");
  }

  const { encryptedVaultKey, deviceId } = await wrapVaultKeyForDevice(vaultKey, userId, userId);
  const updated = await trustedDevicesApi.relink(device.id, {
    devicePublicKey: { deviceId },
    browser: displayInfo.browser,
    platform: displayInfo.platform,
    deviceType: displayInfo.deviceType,
    encryptedVaultKey,
  });

  return { device: updated, deviceId };
}

export default function TrustedDevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<TrustedDeviceResponse[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [currentTrustedDeviceId, setCurrentTrustedDeviceId] = useState<string | null>(null);
  const [currentDeviceState, setCurrentDeviceState] = useState<ClientDeviceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [relinking, setRelinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<TrustedDeviceResponse | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TrustedDeviceResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  const displayInfo = useMemo(() => getDeviceDisplayInfo(), []);
  const currentDeviceRegistered = currentDeviceState === "active";
  const similarActiveDevice = findActiveDeviceWithMatchingMetadata(devices, displayInfo);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (!isVaultUnlocked()) {
      router.push("/vault/unlock");
      return;
    }

    async function load() {
      try {
        const list = await trustedDevicesApi.list();
        setDevices(list);

        if (!session?.user?.id) return;

        const userId = session.user.id;
        const display = getDeviceDisplayInfo();
        const { deviceId } = await getOrCreateDeviceSecret(userId);
        setCurrentDeviceId(deviceId);

        let deviceState = await trustedDevicesApi.deviceState(deviceId);
        const matchingDevice = findActiveDeviceWithMatchingMetadata(list, display);

        if (deviceState.state === "not_registered" && matchingDevice && getSessionVaultKey()) {
          setRelinking(true);
          try {
            const relinked = await relinkBrowserToDevice(userId, matchingDevice, display);
            setDevices((prev) =>
              prev.map((device) => (device.id === relinked.device.id ? relinked.device : device))
            );
            setCurrentDeviceId(relinked.deviceId);
            deviceState = { state: "active", trustedDeviceId: relinked.device.id };
          } catch (relinkError) {
            setError(
              relinkError instanceof Error
                ? relinkError.message
                : "Could not link this browser to your trusted device."
            );
          } finally {
            setRelinking(false);
          }
        }

        setCurrentDeviceState(deviceState.state);
        setCurrentTrustedDeviceId(deviceState.trustedDeviceId ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load devices");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") load();
  }, [status, router, session]);

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    const id = revokeTarget.id;
    setRevoking(true);
    setError(null);
    try {
      await trustedDevicesApi.revoke(id);
      if (
        session?.user?.id &&
        isCurrentTrustedDevice(revokeTarget, currentDeviceId)
      ) {
        await clearVaultClientState(session.user.id);
      }
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, revokedAt: new Date().toISOString() } : d))
      );
      if (currentTrustedDeviceId === id) {
        setCurrentDeviceState("not_registered");
        setCurrentTrustedDeviceId(null);
      }
      setRevokeTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke device");
    } finally {
      setRevoking(false);
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    const id = removeTarget.id;
    setRemoving(true);
    setError(null);
    try {
      await trustedDevicesApi.remove(id);
      setDevices((prev) => prev.filter((device) => device.id !== id));
      if (currentTrustedDeviceId === id) {
        setCurrentTrustedDeviceId(null);
        setCurrentDeviceState("not_registered");
      }
      setRemoveTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove device");
    } finally {
      setRemoving(false);
    }
  }

  async function handleRegisterCurrent() {
    const vaultKey = getSessionVaultKey();
    if (!vaultKey || !session?.user?.id || currentDeviceRegistered) return;

    setRegistering(true);
    setError(null);
    try {
      if (similarActiveDevice) {
        const relinked = await relinkBrowserToDevice(
          session.user.id,
          similarActiveDevice,
          displayInfo
        );
        setDevices((prev) =>
          prev.map((device) => (device.id === relinked.device.id ? relinked.device : device))
        );
        setCurrentDeviceId(relinked.deviceId);
        setCurrentDeviceState("active");
        setCurrentTrustedDeviceId(relinked.device.id);
        setRegisterName("");
        return;
      }

      const { encryptedVaultKey, deviceId } = await wrapVaultKeyForDevice(
        vaultKey,
        session.user.id,
        session.user.id
      );
      const trimmedName = registerName.trim();
      const device = await trustedDevicesApi.create({
        deviceName: trimmedName || displayInfo.defaultDeviceName,
        devicePublicKey: { deviceId },
        browser: displayInfo.browser,
        platform: displayInfo.platform,
        deviceType: displayInfo.deviceType,
        encryptedVaultKey,
      });
      setDevices((prev) => [...prev, device]);
      setCurrentDeviceId(deviceId);
      setCurrentDeviceState("active");
      setCurrentTrustedDeviceId(device.id);
      setRegisterName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register device");
    } finally {
      setRegistering(false);
    }
  }

  function startRename(device: TrustedDeviceResponse) {
    setEditingId(device.id);
    setEditName(device.deviceName);
  }

  function cancelRename() {
    setEditingId(null);
    setEditName("");
  }

  async function handleRename(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Device name cannot be empty");
      return;
    }

    setSavingRename(true);
    setError(null);
    try {
      const updated = await trustedDevicesApi.rename(id, { deviceName: trimmed });
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
      cancelRename();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename device");
    } finally {
      setSavingRename(false);
    }
  }

  if (loading || relinking) {
    return (
      <PageLayout>
        <LoadingState
          label={relinking ? "Linking this browser to your trusted device" : "Loading trusted devices"}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Trusted devices"
        description="Browsers you trust to unlock your private letters on this account."
      />

      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}

      {!currentDeviceRegistered && (
        <Card className="mb-8 space-y-4">
          <CardHeader>
            <CardTitle>
              {similarActiveDevice ? "Link this browser" : "Register this browser"}
            </CardTitle>
            <CardDescription>
              Detected as {formatDeviceMetadataSubtitle(displayInfo)}.
              {similarActiveDevice
                ? ` Link to your existing trusted device "${similarActiveDevice.deviceName}".`
                : " Add a friendly name if you like."}
            </CardDescription>
          </CardHeader>
          {!similarActiveDevice && (
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder={displayInfo.defaultDeviceName}
              maxLength={200}
              aria-label="Device name"
            />
          )}
          <Button onClick={handleRegisterCurrent} disabled={registering}>
            {registering
              ? similarActiveDevice
                ? "Linking…"
                : "Registering…"
              : similarActiveDevice
                ? `Link to ${similarActiveDevice.deviceName}`
                : "Register this device"}
          </Button>
        </Card>
      )}

      {currentDeviceRegistered && (
        <Alert variant="success" className="mb-6">
          This browser is registered as a trusted device.
        </Alert>
      )}

      {devices.length === 0 ? (
        <EmptyState
          title="No trusted devices yet"
          description="Register this browser to unlock your letters here without a recovery code each time."
        />
      ) : (
        <ul className="space-y-3">
          {devices.map((device) => {
            const isCurrent =
              device.id === currentTrustedDeviceId ||
              isCurrentTrustedDevice(device, currentDeviceId);
            const isRevoked = !!device.revokedAt;
            const isEditing = editingId === device.id;

            return (
              <li key={device.id}>
                <Card className={isRevoked ? "opacity-60" : undefined}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={200}
                            aria-label="Rename device"
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleRename(device.id)} disabled={savingRename}>
                              Save
                            </Button>
                            <Button variant="secondary" onClick={cancelRename}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{device.deviceName}</p>
                            {isCurrent && <Badge variant="info">This device</Badge>}
                            {isRevoked && <Badge variant="danger">Revoked</Badge>}
                          </div>
                          <p className="text-sm text-[var(--muted)]">
                            {formatDeviceMetadataSubtitle(device)}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            Added {new Date(device.createdAt).toLocaleDateString()}
                            {device.lastUsedAt &&
                              ` · Last used ${new Date(device.lastUsedAt).toLocaleDateString()}`}
                          </p>
                        </>
                      )}
                    </div>
                    {!isRevoked && !isEditing && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="secondary" onClick={() => startRename(device)}>
                          Rename
                        </Button>
                        <Button variant="danger" onClick={() => setRevokeTarget(device)}>
                          Revoke
                        </Button>
                      </div>
                    )}
                    {isRevoked && !isEditing && (
                      <Button variant="secondary" onClick={() => setRemoveTarget(device)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke this device?"
        description="This device will no longer be able to unlock your vault. You can register it again later if needed."
        confirmLabel="Revoke device"
        loading={revoking}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this revoked device?"
        description="This permanently removes the revoked entry from your list. It cannot unlock your vault and this does not delete your letters."
        confirmLabel="Remove device"
        loading={removing}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />
    </PageLayout>
  );
}
