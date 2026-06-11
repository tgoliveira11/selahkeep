import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function AccountSettingsLoading() {
  return (
    <PageLayout width="medium">
      <LoadingState label="Loading account settings" />
    </PageLayout>
  );
}
