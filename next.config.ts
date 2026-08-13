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
    }, ...["/api/auth/:path*", "/api/student/:path*", "/api/premium/:path*", "/api/staff/:path*", "/api/admin/:path*", "/auth/:path*", "/student/:path*", "/mentor/:path*", "/admin/:path*", "/cms", "/dashboard", "/feed_track_progress", "/upload_your_doc", "/saved", "/notifications", "/singup", "/change_password"].map((source) => ({ source, headers: privateHeaders }))];
  }
};

export default nextConfig;
