import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/ops", destination: "/admin" },
      { source: "/ops/students/:path*", destination: "/admin/students/:path*" },
      { source: "/ops/team", destination: "/admin/staff" },
      { source: "/ops/notifications", destination: "/admin/notifications" },
      { source: "/ops/activity", destination: "/admin/audit" }
    ];
  },
  async headers() {
    let supabaseOrigin="";try{supabaseOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin:"";}catch{supabaseOrigin="";}
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co${supabaseOrigin?` ${supabaseOrigin} ${supabaseOrigin.replace(/^http/,"ws")}`:""}`,
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "worker-src 'self' blob:",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : [])
    ].join("; ");
    const securityHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : [])
    ];
    const privateHeaders = [{ key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate, max-age=0" }];
    return [{
      source: "/:path*",
      headers: securityHeaders
    }, ...["/api/auth/:path*", "/api/student/:path*", "/api/premium/:path*", "/api/staff/:path*", "/api/admin/:path*", "/auth/:path*", "/student/:path*", "/mentor/:path*", "/admin/:path*", "/ops", "/ops/:path*", "/cms", "/dashboard", "/feed_track_progress", "/upload_your_doc", "/saved", "/notifications", "/singup", "/change_password"].map((source) => ({ source, headers: privateHeaders }))];
  }
};

export default nextConfig;
