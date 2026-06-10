export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function getErrorMessage(
  res: Response,
  fallback = "Request failed"
): Promise<string> {
  const data = await parseJsonResponse<{ error?: string }>(res);
  if (data?.error) return data.error;

  if (res.status >= 500) {
    return "Server error. Ensure PostgreSQL is running and migrations have been applied (npm run db:migrate).";
  }

  return `${fallback} (${res.status})`;
}
