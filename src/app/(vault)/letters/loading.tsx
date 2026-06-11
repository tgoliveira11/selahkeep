import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function LettersLoading() {
  return (
    <PageLayout>
      <LoadingState label="Loading your letters" />
    </PageLayout>
  );
}
