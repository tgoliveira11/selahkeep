"use client";

import { LoginTwoFactorPage } from "@tgoliveira/secure-auth/react";
import { LettersAuthChrome } from "@/components/auth/letters-auth-chrome";

export default function Page() {
  return (
    <LoginTwoFactorPage header={<LettersAuthChrome />} afterLoginPath="/letters" />
  );
}
