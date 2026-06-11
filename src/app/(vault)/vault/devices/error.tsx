"use client";

import { RouteError } from "@/components/layout/route-error";

export default function VaultDevicesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} message="Something went wrong loading trusted devices." />;
}
