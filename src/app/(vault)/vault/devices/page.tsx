"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { trustedDevicesApi, type TrustedDeviceResponse } from "@/lib/api-client/trusted-devices";
import { getOrCreateDeviceSecret } from "@/lib/crypto-client/device-storage";
import { getSessionVaultKey, wrapVaultKeyForDevice } from "@/lib/crypto-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";

export default function TrustedDevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<TrustedDeviceResponse[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!vaultKey || !session?.user?.id) return;

    try {
      const { encryptedVaultKey } = await wrapVaultKeyForDevice(
        vaultKey,
        session.user.id,
        session.user.id
      );
      const ua = navigator.userAgent;
      let browser = "unknown";
      if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari")) browser = "Safari";

      const device = await trustedDevicesApi.create({
        deviceName: `${browser} on ${navigator.platform}`,
        browser,
        platform: navigator.platform,
        encryptedVaultKey,
      });
      setDevices((prev) => [...prev, device]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register device");
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Trusted devices</h1>
          <Button variant="secondary" onClick={handleRegisterCurrent}>
            Register this device
          </Button>
        </div>

        {error && <p className="text-[var(--danger)] mb-4">{error}</p>}

        <ul className="space-y-3">
          {devices.map((device) => {
            const isCurrent =
              (device.devicePublicKey as { deviceId?: string } | null)?.deviceId ===
              currentDeviceId;
            const isRevoked = !!device.revokedAt;

            return (
              <li
                key={device.id}
                className={`p-4 bg-white border rounded-lg ${isRevoked ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
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
                    <p className="text-sm text-[var(--muted)]">
                      {device.browser} · {device.platform}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Added {new Date(device.createdAt).toLocaleDateString()}
                      {device.lastUsedAt &&
                        ` · Last used ${new Date(device.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!isRevoked && (
                    <Button variant="danger" onClick={() => handleRevoke(device.id)}>
                      Revoke
                    </Button>
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
