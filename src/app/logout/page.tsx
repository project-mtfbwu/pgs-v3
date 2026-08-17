import { LogoutConfirm } from "@/components/logout-confirm";

function logoutReturnPath(value: string | undefined): { href: string; label: string } {
  if (value === "/ops") return { href: "/ops", label: "Return to Operations" };
  if (value === "/") return { href: "/", label: "Return to PGS home" };
  return { href: "/student/dashboard", label: "Return to dashboard" };
}

export default async function LogoutPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const home = logoutReturnPath(next);
  return <LogoutConfirm homeHref={home.href} homeLabel={home.label} />;
}
