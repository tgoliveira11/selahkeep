"use client";

import { LoginPage } from "@tgoliveira/secure-auth/react";
import { secureAuthUiPublicConfig } from "@/lib/secure-auth-ui-public-config";

export default function Page() {
  return <LoginPage afterLoginPath={secureAuthUiPublicConfig.paths.afterLogin} />;
}
