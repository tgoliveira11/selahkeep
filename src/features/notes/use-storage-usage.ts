"use client";

import { useCallback, useEffect, useState } from "react";
import { storageUsageApi, type StorageUsageResponse } from "@/lib/api-client/note-attachments";

export function useStorageUsage(enabled: boolean) {
  const [usage, setUsage] = useState<StorageUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await storageUsageApi.get();
      setUsage(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load storage usage");
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { usage, loading, error, reload };
}

export function formatStorageMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return "< 0.1 MB";
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
