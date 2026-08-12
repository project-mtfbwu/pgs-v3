import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { signupHtml } from "@/legacy/generated/signup";

export const metadata: Metadata = { title: "Complete Profile" };
export default function SignupPage() { return <PublicLegacyPage slug="signup" html={signupHtml} />; }
