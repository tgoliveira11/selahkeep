import { getLoginTwoFactorInitialUsernameEmail } from "@tgoliveira/secure-auth/next";
import { LoginTwoFactorPage } from "@tgoliveira/secure-auth/react";
import { secureAuth } from "@/lib/secure-auth";

export default async function Page() {
  const initialUsernameEmail = await getLoginTwoFactorInitialUsernameEmail(
    secureAuth.getServices
  );

  return <LoginTwoFactorPage initialUsernameEmail={initialUsernameEmail} />;
}
