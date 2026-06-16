import type { NextConfig } from "next";
import path from "path";

const secureAuthReactClientShim = path.join(
  process.cwd(),
  "src/lib/secure-auth/react-client.ts"
);

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
  turbopack: {
    resolveAlias: {
      "@tgoliveira/secure-auth/react/client": "./src/lib/secure-auth/react-client.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tgoliveira/secure-auth/react/client": secureAuthReactClientShim,
    };
    return config;
  },
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
