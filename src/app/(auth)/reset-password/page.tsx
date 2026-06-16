"use client";

import { ResetPasswordPage } from "@tgoliveira/secure-auth/react";
import { authPageMessages } from "@/lib/auth/auth-page-messages";

export default function Page() {
  return <ResetPasswordPage description={authPageMessages.resetPasswordDescription} />;
}
