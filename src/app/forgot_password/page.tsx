import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { forgotPasswordHtml } from "@/legacy/generated/forgot-password";

export const metadata: Metadata = { title: "Forgot Password" };
export default function ForgotPasswordPage() { return <PublicLegacyPage slug="forgot-password" html={forgotPasswordHtml} />; }
