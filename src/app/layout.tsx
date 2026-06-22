import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { SecureAuthProviders } from "@/components/secure-auth-providers";
import { secureAuthUiPublicConfig } from "@/lib/secure-auth-ui-public-config";
import { SkipLink } from "@/components/layout/skip-link";
import { ThemeInit } from "@/components/layout/theme-toggle";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

/**
 * "Stillness" design direction (see docs/DESIGN_SYSTEM.md). Self-hosted by
 * next/font, so there is no third-party request and it is CSP-safe.
 */
const fontSans = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

/** Required so per-request CSP nonces from proxy.ts apply to Next.js inline scripts. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b3a8c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="relative min-h-screen antialiased">
        <ThemeInit />
        <SkipLink />
        <SecureAuthProviders uiConfig={secureAuthUiPublicConfig}>{children}</SecureAuthProviders>
      </body>
    </html>
  );
}
