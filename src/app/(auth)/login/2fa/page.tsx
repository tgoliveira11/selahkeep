"use client";

import { LettersLoginTwoFactorScreen } from "@/components/auth/letters-login-two-factor-screen";

export default function Page() {
  return <LettersLoginTwoFactorScreen afterLoginPath="/letters" />;
}
