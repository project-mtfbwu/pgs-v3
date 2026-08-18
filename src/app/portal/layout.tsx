import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import "./portal.css";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?surface=guardian&redirect=%2Fportal");
  return (
    <div className="pgs-portal">
      <header className="pgs-portal__header" role="banner">
        <div className="pgs-portal__brand">
          <span className="pgs-portal__brand-initial" aria-hidden="true">P</span>
          <div>
            <strong>Purple Guide</strong>
            <span>Parent / Guardian Portal</span>
          </div>
        </div>
        <nav aria-label="Portal navigation">
          <a href="/portal" className="pgs-portal__nav-link">My Students</a>
        </nav>
      </header>
      <main className="pgs-portal__main" id="main-content">
        {children}
      </main>
      <footer className="pgs-portal__footer" role="contentinfo">
        <p>Purple Guide — Guardian Portal. Access is invitation-only and may be revoked at any time.</p>
        <a href="/logout">Sign out</a>
      </footer>
    </div>
  );
}
