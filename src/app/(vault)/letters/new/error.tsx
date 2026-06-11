"use client";

import { RouteError } from "@/components/layout/route-error";

export default function NewLetterError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} message="Something went wrong opening the letter editor." />;
}
