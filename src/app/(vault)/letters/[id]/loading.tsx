import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function LetterDetailLoading() {
  return (
    <PageLayout>
      <LoadingState label="Opening your letter" />
    </PageLayout>
  );
}
