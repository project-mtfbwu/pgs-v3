"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAndNavigate } from "@/lib/logout-navigation";

export default function LogoutPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await signOutAndNavigate();
    } catch {
      setBusy(false);
      setError("Unable to log out. Please try again.");
    }
  }
  return <main className="pgs-logout-page"><section><p>#PGS ACCOUNT</p><h1>Log out?</h1><p>You can securely end this browser session now.</p><button className="btn btn-purple" onClick={logout} disabled={busy}>{busy ? "Logging out…" : "Logout"}</button>{error && <p role="status">{error}</p>}<Link href="/student/dashboard">Return to dashboard</Link></section></main>;
}
