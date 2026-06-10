import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = isProd
  ? [
      "default-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  : [
      // Next.js dev server requires eval/inline for HMR.
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "connect-src 'self' ws:",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
