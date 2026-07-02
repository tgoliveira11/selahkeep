import { notFound } from "next/navigation";
import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";
import { isApiDocsEnabled } from "@/lib/api-docs-access";
import { SwaggerUi } from "./swagger-ui";

export default function ApiDocsPage() {
  if (!isApiDocsEnabled()) {
    notFound();
  }

  return (
    <main id={MAIN_CONTENT_ID} tabIndex={-1}>
      <div className="border-b border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
        API reference (Swagger UI). Sign in to the app in this browser before trying authenticated
        routes. Spec source: <code>docs/openapi.yaml</code>. This page intentionally omits the app
        navigation shell so Swagger UI can use the full viewport.
      </div>
      <SwaggerUi />
    </main>
  );
}
