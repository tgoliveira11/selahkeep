import type { NextConfig } from "next";
import path from "path";

const vaultPasskeyReactClientShim = path.join(
  process.cwd(),
  "src/lib/secure-auth/vault-passkey-react-client.ts"
);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@tgoliveira/secure-auth/react/client": "./src/lib/secure-auth/vault-passkey-react-client.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tgoliveira/secure-auth/react/client": vaultPasskeyReactClientShim,
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
