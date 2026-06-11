import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";

export default function NewLetterLoading() {
  return (
    <PageLayout>
      <LoadingState label="Opening the letter editor" />
    </PageLayout>
  );
}
