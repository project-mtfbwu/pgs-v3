import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { StudentSidebarStateProvider } from "@/components/student-sidebar-state-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "#PGS", template: "%s | #PGS" },
  description: "PurpleGuide parity-proof migration"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="no-js">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="stylesheet" href="/assets/css/vendors.min.css" />
        <link rel="stylesheet" href="/assets/css/icon.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/responsive.css" />
      </head>
      <body data-mobile-nav-style="classic" className="custom-cursor">
        <StudentSidebarStateProvider>{children}</StudentSidebarStateProvider>
        <Script src="/assets/js/jquery.js" strategy="beforeInteractive" />
        <Script src="/assets/js/vendors.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/main.js" strategy="afterInteractive" />
        <Script src="/assets/js/pgs-autocomplete.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
