"use client";

import { LettersLoginScreen } from "@/components/auth/letters-login-screen";

export default function Page() {
  return <LettersLoginScreen afterLoginPath="/letters" />;
}
