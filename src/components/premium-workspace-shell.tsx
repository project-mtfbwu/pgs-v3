"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { signOutAndNavigate } from "@/lib/logout-navigation";

export function PremiumWorkspaceShell({ name, avatarUrl,stateKind="authenticated_premium",children }: { name: string; avatarUrl: string;stateKind?:"authenticated_standard"|"authenticated_premium";children: ReactNode }) {
  const [sidebar, setSidebar] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return <>
    <header className="premium-legacy-header" data-student-state={stateKind}>
      <Link href="/"><Image src="/assets/img/logo.png" alt="#PGS" width={120} height={45} unoptimized /></Link>
      <nav><Link href="/dashboard">#feed</Link><Link href="/feed_track_progress">Track Your Progress</Link><Link href="/upload_your_doc">Upload Your Docs</Link><Link href="/notifications">Notifications</Link></nav>
      <button type="button" className="premium-account-pill" onClick={() => setDrawer(true)}><Image src={avatarUrl} alt="" width={36} height={36} unoptimized />{name}</button>
    </header>
    <button type="button" className="premium-mobile-toggle" aria-label="Open account menu" onClick={() => setDrawer(true)}>☰</button>
    <aside id="sidebar" className={`arrow-box sidebar-box premium-sidebar${sidebar ? " active" : ""}`}>
      <button id="close_Btn" type="button" onClick={() => setSidebar((value) => !value)} aria-label="Toggle workspace sidebar">→</button>
      <h5>Welcome<br />{name}</h5>
      <ul>
        <li><Link href="/studentresources">#datesDeadlines</Link></li>
        <li><Link href="/dashboard">Premium Dashboard</Link></li>
        <li><Link href="/feed_track_progress">Track Your Progress</Link></li>
        <li><Link href="/upload_your_doc">Upload Your Docs</Link></li>
        <li><Link href="/purpleboard">#purpleboard</Link></li>
      </ul>
    </aside>
    {drawer && <><button className="premium-drawer-overlay" aria-label="Close account menu" onClick={() => setDrawer(false)} /><aside className="premium-drawer drawer active"><button type="button" onClick={() => setDrawer(false)}>×</button><h4>{name}</h4><Link href="/student/profile">Profile</Link><Link href="/saved">Saved List</Link><Link href="/notifications">Notifications</Link><button type="button" onClick={() => void signOutAndNavigate()}>Logout</button></aside></>}
    <div className="wrapper-content premium-workspace-content">{children}</div>
  </>;
}
