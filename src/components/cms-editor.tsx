"use client";

import { createClient, type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { defaultPageContent, type PageContentMap } from "@/lib/content";

const fieldLabels: { [K in keyof PageContentMap]: Record<keyof PageContentMap[K], string> } = {
  home: {
    heroSupport: "Hero support copy",
    introTitle: "Dashboard section title",
    introBody: "Dashboard section copy"
  },
  countriesusa: {
    titleLineOne: "Page title — line one",
    titleLineTwo: "Page title — line two",
    subtitle: "Page subtitle",
    kicker: "Audience line",
    contactCta: "Contact button"
  }
};

export function CmsEditor() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [slug, setSlug] = useState<keyof PageContentMap>("home");
  const [content, setContent] = useState<PageContentMap>(structuredClone(defaultPageContent));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [status, setStatus] = useState(url && key
    ? "Checking editor access…"
    : "Supabase environment variables are not configured. The public proof pages are using their typed fallback copy.");
  const supabase = useMemo(() => url && key ? createClient(url, key) : null, [url, key]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setStatus(data.user ? "Signed in. Loading page content…" : "Sign in with an approved editor email.");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    void supabase.from("page_content").select("slug, content").then(({ data, error }) => {
      if (error) {
        setStatus(`Unable to load editable content: ${error.message}`);
        return;
      }
      const next = structuredClone(defaultPageContent);
      for (const row of data ?? []) {
        if (!row.content || typeof row.content !== "object") continue;
        if (row.slug === "home") Object.assign(next.home, row.content);
        if (row.slug === "countriesusa") Object.assign(next.countriesusa, row.content);
      }
      setContent(next);
      setStatus("Editable proof content loaded.");
    });
  }, [supabase, user]);

  async function signIn() {
    if (!supabase || !email) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/cms` } });
    setStatus(error ? error.message : "Check your email for the secure sign-in link.");
  }

  async function save() {
    if (!supabase || !user) return;
    const { error } = await supabase.from("page_content").upsert({
      slug,
      content: content[slug],
      published: true,
      updated_by: user.id
    }, { onConflict: "slug" });
    setStatus(error ? `Save blocked: ${error.message}` : "Published. Refresh the public page to verify the fixed layout with the new copy.");
  }

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <p style={{ color: "#6340a4", fontWeight: 700, marginBottom: 8 }}>PGS V3 parity proof</p>
      <h1 style={{ marginTop: 0 }}>Minimum page-content editor</h1>
      <p>This editor changes only the approved typed text slots. It cannot alter markup, classes, assets, or section order.</p>
      {!user ? (
        <div style={{ display: "flex", gap: 8, margin: "28px 0" }}>
          <input aria-label="Editor email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="editor@example.com" style={{ flex: 1, padding: 12 }} />
          <button type="button" onClick={() => void signIn()} style={{ padding: "12px 18px" }}>Email sign-in link</button>
        </div>
      ) : (
        <>
          <label style={{ display: "block", margin: "24px 0" }}>
            Proof page
            <select value={slug} onChange={(event) => setSlug(event.target.value as keyof PageContentMap)} style={{ display: "block", width: "100%", marginTop: 6, padding: 10 }}>
              <option value="home">Homepage</option>
              <option value="countriesusa">USA destination</option>
            </select>
          </label>
          {Object.entries(content[slug]).map(([field, value]) => (
            <label key={field} style={{ display: "block", margin: "18px 0" }}>
              {String(fieldLabels[slug][field as never])}
              <textarea
                value={value}
                rows={field === "introBody" ? 5 : 3}
                onChange={(event) => setContent((current) => ({
                  ...current,
                  [slug]: { ...current[slug], [field]: event.target.value }
                }))}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 10, boxSizing: "border-box" }}
              />
            </label>
          ))}
          <button type="button" onClick={() => void save()} style={{ padding: "12px 18px", background: "#ffde7f", border: "1px solid #111", borderRadius: 6 }}>Publish approved slots</button>
        </>
      )}
      <p role="status" style={{ marginTop: 24, padding: 12, background: "#f3effa" }}>{status}</p>
      <a href={slug === "home" ? "/" : "/countriesusa"}>Open the public proof page</a>
    </main>
  );
}
