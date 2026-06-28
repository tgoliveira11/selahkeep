/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVaultPasskeyUnlockPrefetch } from "@/features/passkey/use-vault-passkey-unlock-prefetch";

const requestOptions = vi.fn();

vi.mock("@/lib/passkey/vault-unlock-authenticate", () => ({
  requestVaultUnlockAuthenticationOptions: (...args: unknown[]) => requestOptions(...args),
}));

describe("useVaultPasskeyUnlockPrefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestOptions.mockResolvedValue({
      challenge: "abc",
      allowCredentials: [{ id: "cred-1", type: "public-key", transports: ["internal"] }],
    });
  });

  it("prefetches options when enabled", async () => {
    const { result } = renderHook(() => useVaultPasskeyUnlockPrefetch(true));
    await waitFor(() => {
      expect(result.current.options?.challenge).toBe("abc");
    });
    expect(requestOptions).toHaveBeenCalledTimes(1);
  });

  it("does not prefetch when disabled", async () => {
    renderHook(() => useVaultPasskeyUnlockPrefetch(false));
    await waitFor(() => {
      expect(requestOptions).not.toHaveBeenCalled();
    });
  });

  it("refresh fetches a new challenge after unlock", async () => {
    const { result } = renderHook(() => useVaultPasskeyUnlockPrefetch(true));
    await waitFor(() => expect(result.current.options).toBeTruthy());
    requestOptions.mockResolvedValueOnce({ challenge: "next", allowCredentials: [] });
    await result.current.refresh();
    await waitFor(() => {
      expect(result.current.options?.challenge).toBe("next");
    });
  });
});
