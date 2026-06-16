"use client";

import { LoginPage } from "@tgoliveira/secure-auth/react";
import { LettersAuthChrome } from "@/components/auth/letters-auth-chrome";

export default function Page() {
  return (
    <LoginPage header={<LettersAuthChrome />} afterLoginPath="/letters" />
  );
}
