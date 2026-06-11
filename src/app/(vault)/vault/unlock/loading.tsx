import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function VaultUnlockLoading() {
  return (
    <PageLayout>
      <LoadingState label="Loading vault unlock" />
    </PageLayout>
  );
}
