"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { signOutAndNavigate } from "@/lib/logout-navigation";
import type { StudentExperienceKind } from "@/lib/student-experience";
import { premiumLockedLabel, premiumShellDestination, studentSidebarLinks, type StudentShellNavKey } from "@/lib/student-shell-contract";

type Props = {
  name: string;
  email?: string;
  avatarUrl: string;
  stateKind: StudentExperienceKind;
  unreadCount?: number;
  active?: StudentShellNavKey;
  children: ReactNode;
  contentClassName?: string;
};

export function ApprovedStudentShell({ name, email = "", avatarUrl, stateKind, unreadCount = 0, active, children, contentClassName = "" }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const premiumHref = premiumShellDestination(stateKind);
  const authenticated=stateKind!=="anonymous";

  async function logout() {
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await signOutAndNavigate();
    } catch {
      setLogoutBusy(false);
      setLogoutError("Unable to log out. Please try again.");
    }
  }

  return <div className="approved-student-shell" data-student-state={stateKind}>
    <div className="approved-student-urgent" data-node-id="17038:12529">
      <span>Urgent: MCAT Registration closes in 7 days - Don&apos;t miss out!</span>
      <Image src="/assets/img/bell.gif" alt="" width={40} height={40} unoptimized />
    </div>

    <header className="approved-student-header" data-node-id="17038:12493">
      <Link className="approved-student-logo" href="/" aria-label="PurpleGuide home">
        <Image src="/assets/img/logo.png" alt="#PGS" width={173} height={35} unoptimized />
      </Link>
      <nav className="approved-student-primary-nav" aria-label="Primary student navigation" data-node-id="17038:12494">
        <Link className={active === "feed" ? "is-active" : ""} href="/student/dashboard">#feed</Link>
        <Link className={active === "premium" ? "is-active is-premium" : ""} href={premiumHref}>#purplePremium</Link>
        <Link className={active === "cv" ? "is-active" : ""} href="/cvreadyprogram">#cvReadyPrograms</Link>
      </nav>
      <nav className="approved-student-secondary-nav" aria-label="Explore">
        <Link className={active === "rotation" ? "is-active" : ""} href="/usmlerotation">#USMLERotation</Link>
        <Link className={active === "countries" ? "is-active" : ""} href="/explorecountries">#exploreCountries</Link>
      </nav>
      {authenticated?<button className="approved-student-account-button" type="button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
        account
        {unreadCount > 0 && <span aria-label={`${unreadCount} unread notifications`}>{unreadCount}</span>}
      </button>:<Link className="approved-student-account-button approved-student-login" href="/login">login</Link>}
      {authenticated&&accountOpen && <div className="approved-student-account-menu">
        {email && <small>{email}</small>}
        <Link href="/student/profile">Profile</Link>
        <Link href="/saved">Saved List</Link>
        <Link href="/notifications">Notifications{unreadCount ? ` (${unreadCount})` : ""}</Link>
        <Link href="/change_password">Change password</Link>
        <button type="button" disabled={logoutBusy} onClick={() => void logout()}>{logoutBusy ? "Logging out…" : "Logout"}</button>
        {logoutError && <small role="status">{logoutError}</small>}
      </div>}
    </header>

    <div className="approved-student-tools">
      <button className="approved-student-greeting" type="button" disabled={!authenticated} onClick={() => authenticated&&setAccountOpen((open) => !open)} data-node-id="17038:12521">
        <Image src={avatarUrl} alt="" width={36} height={36} unoptimized data-node-id="17038:12522" />
        <span><small>Hello 👋</small><strong>{name || "Aspirant"}</strong></span>
      </button>
      <div className="approved-univ-meet" aria-label="University meeting dates"><span>#univMeet</span><time dateTime="2025-12-31"><b>31</b><small>Dec 25</small></time><time dateTime="2025-12-31"><b>31</b><small>Dec 25</small></time></div>
      <label className="approved-student-search"><span className="sr-only">Search courses and destinations</span><input type="search" placeholder="Search" /></label>
    </div>

    <button className="approved-sidebar-toggle" type="button" aria-label={sidebarOpen ? "Close student navigation" : "Open student navigation"} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)} data-node-id="17038:12534">
      <Image src="/assets/img/sidebar-arrow.png" alt="" width={32} height={32} unoptimized />
    </button>
    {sidebarOpen && <aside className="approved-student-sidebar" aria-label="Student navigation">
      <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close student navigation"><Image src="/assets/img/sidebar-arrow.png" alt="" width={32} height={32} unoptimized /></button>
      <ul>{studentSidebarLinks.map((item) => <li key={item.href}><Link aria-current={active === item.key ? "page" : undefined} href={item.href}>{item.label}</Link></li>)}</ul>
      <div><span>WELCOME</span><strong>{name}</strong>{authenticated?<><Link href="/student/profile">Profile</Link><Link href="/saved">Saved List</Link><button type="button" disabled={logoutBusy} onClick={() => void logout()}>Logout</button></>:<Link href="/login">Login</Link>}</div>
    </aside>}
    <main className={`approved-student-content ${contentClassName}`.trim()}>{children}</main>
  </div>;
}

export function StudentIdentityCard({ name, email, avatarUrl, pathway, premiumActive }: { name: string; email: string; avatarUrl: string; pathway?: string | null; premiumActive: boolean }) {
  return <section className="approved-student-identity card-box-avatar" data-node-id="17098:13246">
    <div className="avatar-info">
      <div className="avatar-img"><Image src={avatarUrl} alt="" width={68} height={83} unoptimized /><div className="avatar_name"><h5>{name}</h5><span>{email}</span></div></div>
      <div className="title-info"><h5>#purplePremium</h5><h6>{pathway || "STUDENT"} PATHWAY</h6></div>
    </div>
    <div className="approved-student-entitlement">{premiumActive?<Link href="/dashboard">#PURPLEPREMIUM</Link>:<span className="premium-entitlement-locked">{premiumLockedLabel}</span>}</div>
  </section>;
}
