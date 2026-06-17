import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/letters", destination: "/notes", permanent: true },
      { source: "/letters/new", destination: "/notes/new", permanent: true },
      { source: "/letters/:id", destination: "/notes/:id", permanent: true },
    ];
  },
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
