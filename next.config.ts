import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http: https://res.cloudinary.com",
      "connect-src 'self' http://localhost:8000 https://api.mysugu.com https://*.mysugu.com https://pro.sugu.pro https://*.sugu.pro https://res.cloudinary.com https://*.cloudinary.com",
      "worker-src 'self'",
      "manifest-src 'self'",
    ].join("; "),
  },
];

const privateNoIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const privateRoutePatterns = [
  "/vendor/:path*",
  "/agency/:path*",
  "/driver/:path*",
  "/login",
  "/forgot-password",
  "/reset-password/:path*",
  "/signup/:path*",
  "/api/:path*",
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "api.mysugu.com" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn.sugu.pro" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      ...privateRoutePatterns.map((source) => ({
        source,
        headers: privateNoIndexHeaders,
      })),
    ];
  },

  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
