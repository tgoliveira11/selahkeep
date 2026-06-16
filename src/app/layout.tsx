import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SecureAuthProviders } from "@/components/secure-auth-providers";
import { secureAuthUiPublicConfig } from "@/lib/secure-auth-ui-public-config";
import { SkipLink } from "@/components/layout/skip-link";

/** Required so per-request CSP nonces from proxy.ts apply to Next.js inline scripts. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Letters to God",
  description: "Your private letters are protected on your device before they are saved.",
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
