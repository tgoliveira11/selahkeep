"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { ErrorState } from "@/components/ui/error-state";

interface RouteErrorProps {
  reset: () => void;
  message?: string;
}

export function RouteError({
  reset,
  message = "Something went wrong loading this page. Your private notes were not affected.",
}: RouteErrorProps) {
  return (
    <PageLayout>
      <ErrorState message={message} onRetry={reset} />
    </PageLayout>
  );
}
