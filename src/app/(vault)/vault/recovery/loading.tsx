import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function VaultRecoveryLoading() {
  return (
    <PageLayout>
      <LoadingState label="Loading recovery settings" />
    </PageLayout>
  );
}
