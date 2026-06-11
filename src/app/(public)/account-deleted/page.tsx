import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountDeletedPage() {
  return (
    <PageLayout width="medium" className="text-center">
      <Card className="mx-auto max-w-lg py-4">
        <CardHeader className="items-center text-center">
          <CardTitle>Your account has been deleted</CardTitle>
          <CardDescription>
            Your account and encrypted data have been removed from active storage. Local private
            material on this browser was cleared when possible.
          </CardDescription>
        </CardHeader>
        <Link href="/" className="mt-2 inline-block">
          <Button variant="secondary">Return home</Button>
        </Link>
      </Card>
    </PageLayout>
  );
}
