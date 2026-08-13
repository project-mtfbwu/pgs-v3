"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function logout() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }
  return <main className="pgs-logout-page"><section><p>#PGS ACCOUNT</p><h1>Log out?</h1><p>You can securely end this browser session now.</p><button className="btn btn-purple" onClick={logout} disabled={busy}>{busy ? "Logging out…" : "Logout"}</button><Link href="/student/dashboard">Return to dashboard</Link></section></main>;
}
