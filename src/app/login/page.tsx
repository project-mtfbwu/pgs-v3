import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { loginHtml } from "@/legacy/generated/login";

export const metadata: Metadata = { title: "Login" };
export default function LoginPage() { return <PublicLegacyPage slug="login" html={loginHtml} />; }
