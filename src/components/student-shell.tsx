"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { signOutAndNavigate } from "@/lib/logout-navigation";

type Props = { name: string; email: string; avatarUrl: string; unreadCount?: number; children: ReactNode };

export function StudentShell({ name, email, avatarUrl, unreadCount = 0, children }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    setBusy(true);
    setLogoutError("");
    try {
      await signOutAndNavigate();
    } catch {
      setBusy(false);
      setLogoutError("Unable to log out. Please try again.");
    }
  }
  return <>
    <header className="pgs-student-header">
      <Link href="/" className="pgs-student-brand">#PGS</Link>
      <nav aria-label="Student account">
        <Link href="/student/dashboard">Dashboard</Link>
        <Link href="/saved">Saved</Link>
        <Link href="/studentresources">Resources</Link>
        <Link href="/notifications" aria-label={`Notifications, ${unreadCount} unread`}>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</Link>
        <button type="button" onClick={() => setOpen((value) => !value)} className="pgs-student-account">
          <Image src={avatarUrl} alt="" width={36} height={36} unoptimized />
          <span>{name}</span>
        </button>
      </nav>
      {open && <div className="pgs-account-menu">
        <span>{email}</span>
        <Link href="/student/profile">Edit profile</Link>
        <Link href="/change_password">Change password</Link>
        <button type="button" onClick={logout} disabled={busy}>{busy ? "Logging out…" : "Logout"}</button>
        {logoutError && <span role="status">{logoutError}</span>}
      </div>}
    </header>
    <main className="pgs-student-main">{children}</main>
  </>;
}
