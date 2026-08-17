import { getContentPreviewLabel } from "@/lib/content-preview";

export async function ContentPreviewBanner() {
  const label = await getContentPreviewLabel();
  if (!label) return null;
  return (
    <aside className="pgs-content-preview-banner" role="status" aria-label="CMS preview mode">
      <div>
        <strong>Draft preview</strong>
        <span>You are viewing the real PGS page with {label}. Public visitors still see published content.</span>
      </div>
      <form action="/api/admin/preview/exit" method="post">
        <button type="submit">Exit preview</button>
      </form>
    </aside>
  );
}
