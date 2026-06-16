import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SecureAuthProviders } from "@/components/secure-auth-providers";
import { secureAuth } from "@/lib/secure-auth";
import { SkipLink } from "@/components/layout/skip-link";

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
        <SecureAuthProviders uiConfig={secureAuth.uiConfig}>{children}</SecureAuthProviders>
      </body>
    </html>
  );
}
