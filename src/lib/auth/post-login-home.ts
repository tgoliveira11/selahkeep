const POST_LOGIN_HOME_KEY = "selahkeep:post-login-home";

/** Mark that the next visit to `/home` is the post-login landing (session-scoped). */
export function markPostLoginHomePending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(POST_LOGIN_HOME_KEY, "1");
}

/** Returns whether a post-login `/home` visit was pending; clears the marker when true. */
export function consumePostLoginHomePending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const pending = sessionStorage.getItem(POST_LOGIN_HOME_KEY) === "1";
  if (pending) sessionStorage.removeItem(POST_LOGIN_HOME_KEY);
  return pending;
}
