"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { StaffPreviewBanner } from "@/components/staff-preview-banner";
import { StudentNotificationDropdown } from "@/components/student-notification-dropdown";
import { useStudentSidebarState } from "@/components/student-sidebar-state-provider";
import { signOutAndNavigate } from "@/lib/logout-navigation";
import type { StudentExperienceKind, StudentHeaderNotification, StudentPreviewState } from "@/lib/student-experience";
import {
  premiumShellDestination,
  studentSidebarLinks,
  type StudentShellNavKey
} from "@/lib/student-shell-contract";

const sidebarIcons: Readonly<Record<string, string>> = {
  "/studentresources": "/assets/img/loading-icon.png",
  "/feed_track_progress": "/assets/img/loading-icon.png",
  "/purpleboard": "/assets/img/loading-icon.png",
  "/upload_your_doc": "/assets/img/upload-icon.png",
  "/finance": "/assets/img/finance-icon.png",
  "/scholarship": "/assets/img/scholar-icon.png",
  "/cvreadyprogram": "/assets/img/cvready-icon.png"
};

type Props = {
  name: string;
  email?: string;
  avatarUrl: string;
  stateKind: StudentExperienceKind;
  unreadCount?: number;
  notifications?: StudentHeaderNotification[];
  active?: StudentShellNavKey;
  children: ReactNode;
  contentClassName?: string;
  preview?: StudentPreviewState;
};

export function DeveloperStudentShell({
  name,
  email = "",
  avatarUrl,
  stateKind,
  unreadCount = 0,
  notifications = [],
  active,
  children,
  contentClassName = "",
  preview
}: Props) {
  const { open: sidebarOpen, toggle: toggleSidebarState } = useStudentSidebarState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const authenticated = stateKind !== "anonymous";
  const premiumHref = premiumShellDestination(stateKind);

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

  function toggleSidebar(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    toggleSidebarState();
  }

  const profileHref = authenticated ? "/student/profile" : "/login?redirect=%2Fstudent%2Fprofile";
  const savedHref = authenticated ? "/saved" : "/login?redirect=%2Fsaved";

  return (
    <div className="developer-student-shell" data-student-state={stateKind}>
      {preview ? (
        <StaffPreviewBanner actorName={preview.actorName} mode="student" targetName={preview.targetName} />
      ) : null}
      <header className="developer-student-header">
        <div className="mobile-none">
          <nav className="navbar navbar-expand-lg header-light header-transparent bg-transparent disable-fixed">
            <div className="container-fluid">
              <Link className="navbar-brand" href="/" aria-label="PurpleGuide home">
                <Image src="/assets/img/logo.png" alt="#PGS" width={173} height={35} unoptimized />
              </Link>
              <ul className="header-tab-top">
                <li><Link className={active === "feed" ? "active-tab" : ""} href="/student/dashboard">#feed</Link></li>
                <li><details className="developer-header-dropdown"><summary className={active === "premium" ? "active-tab" : ""}>#purplePremium</summary><div><Link href={premiumHref}>Premium dashboard</Link><Link href="/home/purplepremium_overview">Overview</Link><Link href="/purplenonmedical">STEM &amp; MBA pathways</Link><Link href="/purpleusme">USMLE</Link><Link href="/purpleplab">PLAB</Link><Link href="/purpleamc">AMC</Link></div></details></li>
                <li><Link className={active === "cv" ? "active-tab" : ""} href="/cvreadyprogram">#cvReadyPrograms</Link></li>
              </ul>
              <div className="developer-header-links">
                <Link href="/usmlerotation">#USMLERotation</Link>
                <details className="developer-header-dropdown"><summary>#exploreCountries</summary><div><Link href="/explorecountries">Explore all</Link><Link href="/countriesusa">USA</Link><Link href="/countriesuk">UK</Link><Link href="/countriescanada">Canada</Link><Link href="/countriesaus">Australia</Link><Link href="/countrieseurope">Europe</Link></div></details>
                <StudentNotificationDropdown initialItems={notifications} unreadCount={unreadCount} readOnly={Boolean(preview)} />
                {authenticated
                  ? <Link className="btn btn-login pgs-auth-account" data-student-state={stateKind} href="/student/dashboard">{name}</Link>
                  : <Link className="btn btn-login" href="/login">Login</Link>}
              </div>
            </div>
          </nav>
        </div>

        <div className="mobile-block mobile-header">
          <Link href="/" aria-label="PurpleGuide home">
            <Image src="/assets/img/logo.png" alt="#PGS" width={132} height={31} unoptimized />
          </Link>
          <div className="developer-mobile-actions">
            <StudentNotificationDropdown initialItems={notifications} unreadCount={unreadCount} readOnly={Boolean(preview)} mobile />
            {authenticated ? <Link href="/student/dashboard">{name}</Link> : <Link href="/login">Login</Link>}
            <button className="btn-toggle-mobile" type="button" aria-label="Open mobile navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
              <Image src="/assets/img/toggle-lines.png" alt="" width={20} height={20} unoptimized />
            </button>
          </div>
        </div>
      </header>

      <section className="developer-student-tools">
        <div className="avatar-box">
          <div className="avatar-img"><Image src={avatarUrl} alt="" width={36} height={36} unoptimized /></div>
          <div><h5>Hello <span aria-hidden="true">👋</span></h5><h4>{name || "Aspirant"}</h4></div>
        </div>
        <Link className="developer-univ-meet" href="/programsfull"><span>#univMeet</span></Link>
        <label className="search-box"><span className="sr-only">Search programs and events</span><input className="search-control" type="search" placeholder="Search programs & events…" /></label>
      </section>

      <section className="pt-1 pb-0 mobile-frame-sidebar">
        <div className={`arrow-box sidebar-box${sidebarOpen ? " active" : ""}`} id="sidebar" aria-hidden={!sidebarOpen}>
          <div className="d-flex justify-content-space align-items-start">
            <h5 className="pt-13 text-black fs-48 fnt-family text-start">Welcome<br />{name || "Aspirant"}</h5>
            <button id="close_Btn" className="developer-sidebar-close flot-arrow-sidebar" type="button" onClick={toggleSidebar} aria-label="Close student navigation">
              <Image src="/assets/img/sidebar-arrow.png" alt="" width={32} height={32} unoptimized />
            </button>
          </div>
          <ul className="ml-0">
            {studentSidebarLinks.map((item) => (
              <li key={item.href}>
                <Link className={active === item.key ? "active-tab" : ""} aria-current={active === item.key ? "page" : undefined} href={item.href}>
                  <span className="fit-icon-sidebar"><Image src={sidebarIcons[item.href]} alt="" width={32} height={32} unoptimized /></span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="developer-sidebar-account-row d-flex justify-content-space">
            <Link href={profileHref} className="text-black fs-20"><Image src="/assets/img/profile-icon.png" alt="" width={30} height={30} unoptimized /><span>Profile</span></Link>
            <Link href={savedHref} className="text-black fs-20"><Image src="/assets/img/heart-icon.png" alt="" width={30} height={30} unoptimized /><span>Saved List</span></Link>
            {authenticated
              ? <button className="text-black fs-20" type="button" disabled={logoutBusy} onClick={() => void logout()}><Image src="/assets/img/logout.png" alt="" width={30} height={30} unoptimized /><span>{logoutBusy ? "Logging out…" : "Logout"}</span></button>
              : <Link href="/login" className="text-black fs-20"><Image src="/assets/img/logout.png" alt="" width={30} height={30} unoptimized /><span>Login</span></Link>}
          </div>
          {logoutError && <p className="developer-logout-error" role="status">{logoutError}</p>}
        </div>
        <button className="arrow-box developer-sidebar-toggle" id="toggleBtn" type="button" aria-label={sidebarOpen ? "Close student navigation" : "Open student navigation"} aria-controls="sidebar" aria-expanded={sidebarOpen} onClick={toggleSidebar}>
          <Image src="/assets/img/sidebar-arrow.png" alt="" width={32} height={32} unoptimized />
        </button>
      </section>

      {drawerOpen && (
        <>
          <button className="overlay active" type="button" aria-label="Close mobile navigation" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer active developer-mobile-drawer" aria-label="Mobile student navigation">
            <button type="button" aria-label="Close mobile navigation" onClick={() => setDrawerOpen(false)}>×</button>
            {authenticated && email && <small>{email}</small>}
            <Link href="/student/dashboard">#feed</Link>
            <Link href={premiumHref}>#purplePremium</Link>
            <Link href="/home/purplepremium_overview">Premium overview</Link>
            <Link href="/purplenonmedical">STEM &amp; MBA pathways</Link>
            <Link href="/purpleusme">USMLE pathway</Link>
            <Link href="/purpleplab">PLAB pathway</Link>
            <Link href="/purpleamc">AMC pathway</Link>
            <Link href="/cvreadyprogram">#cvReadyPrograms</Link>
            <Link href="/usmlerotation">#USMLERotation</Link>
            <Link href="/explorecountries">#exploreCountries</Link>
            <Link href="/purpleboard">#purpleboard</Link>
            <Link href={profileHref}>Profile</Link>
            <Link href={savedHref}>Saved List</Link>
            {authenticated
              ? <button type="button" disabled={logoutBusy} onClick={() => void logout()}>Logout</button>
              : <Link href="/login">Login</Link>}
          </aside>
        </>
      )}

      <main className={`wrapper-content developer-student-content ${contentClassName}`.trim()}>{children}</main>
    </div>
  );
}

export function DeveloperStudentIdentityCard({
  name,
  email,
  avatarUrl,
  pathway,
  premiumActive
}: {
  name: string;
  email: string;
  avatarUrl: string;
  pathway?: string | null;
  premiumActive: boolean;
}) {
  return (
    <section className="w-729px p-0 mobile-student-cart">
      <div className="card-box-avatar mt-2">
        <div className="avatar-info position-relative">
          <div className="avatar-img">
            <Image src={avatarUrl} alt="" width={68} height={83} unoptimized />
            <div className="avatar_name"><h5>{name}</h5><span>{email}</span></div>
          </div>
          <div className="title-info"><h5>#purplePremium</h5><h6>{pathway || "STUDENT"} PATHWAY</h6></div>
        </div>
        <div className="avatar-heading-right-box">
          <h4>{premiumActive ? <Link href="/dashboard">#PURPLEPREMIUM</Link> : <span>Yet to Unlock<br />Full Access</span>}</h4>
        </div>
      </div>
    </section>
  );
}
