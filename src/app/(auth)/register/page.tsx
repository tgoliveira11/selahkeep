"use client";

import { RegisterPage } from "@tgoliveira/secure-auth/react";
import { secureAuthUiPublicConfig } from "@/lib/secure-auth-ui-public-config";

export default function Page() {
  return <RegisterPage afterLoginPath={secureAuthUiPublicConfig.paths.afterLogin} />;
}
