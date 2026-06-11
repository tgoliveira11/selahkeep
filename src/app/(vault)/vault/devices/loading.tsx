import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function VaultDevicesLoading() {
  return (
    <PageLayout>
      <LoadingState label="Loading trusted devices" />
    </PageLayout>
  );
}
