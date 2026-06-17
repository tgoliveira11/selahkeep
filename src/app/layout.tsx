import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SecureAuthProviders } from "@/components/secure-auth-providers";
import { secureAuthUiPublicConfig } from "@/lib/secure-auth-ui-public-config";
import { SkipLink } from "@/components/layout/skip-link";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

/** Required so per-request CSP nonces from proxy.ts apply to Next.js inline scripts. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen antialiased">
        <SkipLink />
        <SecureAuthProviders uiConfig={secureAuthUiPublicConfig}>{children}</SecureAuthProviders>
      </body>
    </html>
  );
}
