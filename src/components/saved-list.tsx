"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type SavedProgram = { program_id: number; programs: { id: number; title: string; slug: string; short_description: string } | null };
export type SavedCourse = { course_id: number; courses: { id: number; title: string; slug: string; short_description: string } | null };

export function SavedList({ programs: initialPrograms, courses: initialCourses }: { programs: SavedProgram[]; courses: SavedCourse[] }) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [courses, setCourses] = useState(initialCourses);
  const [status, setStatus] = useState("");
  async function remove(kind: "programs" | "courses", id: number) {
    const response = await fetch(`/api/student/saved/${kind}/${id}`, { method: "DELETE" });
    if (!response.ok) { setStatus("Unable to remove that saved item."); return; }
    if (kind === "programs") setPrograms((items) => items.filter((item) => item.program_id !== id));
    else setCourses((items) => items.filter((item) => item.course_id !== id));
    setStatus("Removed from saved.");
  }
  return <div className="saved-list-pgs">
    {status && <p role="status">{status}</p>}
    <SavedSection id="courses" title="Saved Courses" empty="No saved courses yet.">
      {courses.map((item) => item.courses && <article className="pgs-saved-card" key={item.course_id}>
        <span>#purpleboard</span><h3>{item.courses.title}</h3><p>{item.courses.short_description}</p>
        <div><Link href="/purpleboard">View course</Link><button onClick={() => remove("courses", item.course_id)} aria-label={`Remove ${item.courses?.title}`}>♥</button></div>
      </article>)}
    </SavedSection>
    <SavedSection id="programs" title="Saved Programs" empty="No saved programs yet.">
      {programs.map((item) => item.programs && <article className="pgs-saved-card" key={item.program_id}>
        <span>CV-READY PROGRAM</span><h3>{item.programs.title}</h3><p>{item.programs.short_description}</p>
        <div><Link href={`/programsfull/program/${item.programs.id}`}>Learn more</Link><button onClick={() => remove("programs", item.program_id)} aria-label={`Remove ${item.programs?.title}`}>♥</button></div>
      </article>)}
    </SavedSection>
    {!courses.length && !programs.length && <div className="pgs-empty-state"><h2>Your saved list is ready</h2><p>Save published courses and programs to find them here.</p><Link href="/cvreadyprogram">Discover programs</Link></div>}
  </div>;
}

function SavedSection({ id, title, empty, children }: { id: string; title: string; empty: string; children: ReactNode }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;
  return <section id={id} className="pgs-saved-section"><h2>{title}</h2>{count ? <div className="pgs-saved-grid">{children}</div> : <p>{empty}</p>}</section>;
}
