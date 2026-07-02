/** Same gate as `/api-docs` — OpenAPI JSON is not public in production unless explicitly enabled. */
export function isApiDocsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ENABLE_API_DOCS === "true";
}
