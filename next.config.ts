import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ];
    const privateHeaders = [{ key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate, max-age=0" }];
    return [{
      source: "/:path*",
      headers: securityHeaders
    }, ...["/api/auth/:path*", "/api/student/:path*", "/auth/:path*", "/student/:path*", "/saved", "/notifications", "/singup", "/change_password"].map((source) => ({ source, headers: privateHeaders }))];
  }
};

export default nextConfig;
