"use client";

import { RegisterPage } from "@tgoliveira/secure-auth/react";
import { LettersAuthChrome } from "@/components/auth/letters-auth-chrome";

export default function Page() {
  return <RegisterPage header={<LettersAuthChrome />} afterLoginPath="/letters" />;
}
