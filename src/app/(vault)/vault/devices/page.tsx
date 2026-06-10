"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trustedDevicesApi, type TrustedDeviceResponse } from "@/lib/api-client/trusted-devices";
import { getOrCreateDeviceSecret } from "@/lib/crypto-client/device-storage";
import { getSessionVaultKey, wrapVaultKeyForDevice } from "@/lib/crypto-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { getDeviceDisplayInfo, formatDeviceMetadataSubtitle } from "@/lib/device-display-info";
import {
  isCurrentTrustedDevice,
  isDeviceAlreadyRegistered,
} from "@/lib/trusted-device-utils";

export default function TrustedDevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<TrustedDeviceResponse[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const displayInfo = useMemo(() => getDeviceDisplayInfo(), []);
  const currentDeviceRegistered = isDeviceAlreadyRegistered(devices, currentDeviceId);

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
        if (session?.user?.id) {
          const { deviceId } = await getOrCreateDeviceSecret(session.user.id);
          setCurrentDeviceId(deviceId);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load devices");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") load();
  }, [status, router, session]);

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this device? It will no longer be able to unlock your vault.")) return;
    try {
      await trustedDevicesApi.revoke(id);
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, revokedAt: new Date().toISOString() } : d))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke device");
    }
  }

  async function handleRegisterCurrent() {
    const vaultKey = getSessionVaultKey();
    if (!vaultKey || !session?.user?.id || currentDeviceRegistered) return;

    setRegistering(true);
    setError(null);
    try {
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

  if (loading) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12">Loading...</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold">Trusted devices</h1>
        </div>

        {error && <p className="text-[var(--danger)] mb-4">{error}</p>}

        {!currentDeviceRegistered ? (
          <section className="mb-8 p-4 bg-white border rounded-lg space-y-3">
            <h2 className="font-medium">Register this device</h2>
            <p className="text-sm text-[var(--muted)]">
              Detected as {formatDeviceMetadataSubtitle(displayInfo)}. You can add a friendly name
              or use the default label.
            </p>
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder={displayInfo.defaultDeviceName}
              maxLength={200}
              aria-label="Device name"
            />
            <Button onClick={handleRegisterCurrent} disabled={registering}>
              {registering ? "Registering..." : "Register this device"}
            </Button>
          </section>
        ) : (
          <p className="mb-6 text-sm text-[var(--muted)]">
            This browser is already registered as a trusted device.
          </p>
        )}

        <ul className="space-y-3">
          {devices.map((device) => {
            const isCurrent = isCurrentTrustedDevice(device, currentDeviceId);
            const isRevoked = !!device.revokedAt;
            const isEditing = editingId === device.id;

            return (
              <li
                key={device.id}
                className={`p-4 bg-white border rounded-lg ${isRevoked ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={200}
                          aria-label="Rename device"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRename(device.id)}
                            disabled={savingRename}
                          >
                            Save
                          </Button>
                          <Button variant="secondary" onClick={cancelRename}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-medium">
                        {device.deviceName}
                        {isCurrent && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            This device
                          </span>
                        )}
                        {isRevoked && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Revoked
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-sm text-[var(--muted)]">
                      {formatDeviceMetadataSubtitle(device)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Added {new Date(device.createdAt).toLocaleDateString()}
                      {device.lastUsedAt &&
                        ` · Last used ${new Date(device.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!isRevoked && !isEditing && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="secondary" onClick={() => startRename(device)}>
                        Rename
                      </Button>
                      <Button variant="danger" onClick={() => handleRevoke(device.id)}>
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
