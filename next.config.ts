import type { NextConfig } from "next";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

const nextConfig: NextConfig = {
  // The UI is a client app over this app's own API (the same one external clients use), so no
  // page renders server data and Cache Components would add nothing but constraints.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser talks to Supabase Auth through this app's origin, so sign-in works from any
  // device that can reach the app (a phone on the same network included) without CORS setup.
  // Only the auth API is proxied; data goes through /api.
  async rewrites() {
    return [{ source: "/supabase/auth/v1/:path*", destination: `${supabaseUrl}/auth/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
