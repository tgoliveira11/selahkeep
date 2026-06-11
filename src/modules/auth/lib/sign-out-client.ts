"use client";

import { signOut } from "next-auth/react";
import { accountSessionsApi } from "@/lib/api-client/account-sessions";

/** Revoke the server-side account session, then clear the NextAuth cookie. */
export async function signOutAccount(): Promise<void> {
  try {
    await accountSessionsApi.revokeCurrent();
  } catch {
    // Still sign out locally if the API is unavailable or the session already ended.
  }
  await signOut({ redirect: false });
}
