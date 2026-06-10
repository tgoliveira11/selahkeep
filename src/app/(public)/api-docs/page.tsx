import { notFound } from "next/navigation";
import { SwaggerUi } from "./swagger-ui";

export default function ApiDocsPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_API_DOCS === "true";

  if (!enabled) {
    notFound();
  }

  return (
    <main>
      <div className="border-b border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
        API reference (Swagger UI). Sign in to the app in this browser before trying authenticated
        routes. Spec source: <code>docs/openapi.yaml</code>
      </div>
      <SwaggerUi />
    </main>
  );
}
