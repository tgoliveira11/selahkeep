"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LoginCompletePage } from "@tgoliveira/secure-auth/react";
import { markPostLoginHomePending } from "@/lib/auth/post-login-home";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/safe-auth-callback";

function LoginCompleteContent() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") ?? searchParams.get("returnTo");
  const afterLoginPath = sanitizeAuthCallbackUrl(rawCallback);

  useEffect(() => {
    if (afterLoginPath === "/home" || afterLoginPath.startsWith("/home/")) {
      markPostLoginHomePending();
    }
  }, [afterLoginPath]);

  return <LoginCompletePage afterLoginPath={afterLoginPath} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginCompleteContent />
    </Suspense>
  );
}
