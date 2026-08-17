"use client";
import Image from "next/image";
import { useState } from "react";

export function AdminMediaManager({ assets, canManage }: { assets: Array<Record<string, unknown>>; canManage: boolean }) {
  const [message, setMessage] = useState("");
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Uploading…");
    const response = await fetch("/api/admin/media", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { message?: string };
    if (!response.ok) return setMessage(result.message ?? "Unable to upload.");
    window.location.reload();
  }
  async function remove(asset: Record<string, unknown>) {
    if (!window.confirm("Delete this unused media asset? Attached catalog or Saved media cannot be deleted.")) return;
    const response = await fetch("/api/admin/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: asset.id }) });
    const result = await response.json() as { message?: string };
    if (!response.ok) return setMessage(result.message ?? "Unable to delete.");
    window.location.reload();
  }
  return (
    <div className="ops-media-grid">
      {canManage && (
        <form className="ops-card ops-media-upload" onSubmit={upload}>
          <h2>Upload approved media</h2>
          <label>File<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4" /></label>
          <label>Library<select name="bucket"><option value="marketing-public">Public marketing</option><option value="cms-previews">Private CMS preview</option></select></label>
          <label>Alternative text<input name="alt_text" maxLength={500} /></label>
          <label>Attribution<input name="attribution" maxLength={1000} /></label>
          <button className="ops-primary">Upload media</button>
          <p role="status">{message}</p>
        </form>
      )}
      <section className="ops-media-list">
        {assets.map((asset) => (
          <article className="ops-card" key={String(asset.id)}>
            {asset.bucket === "marketing-public" && String(asset.mime_type).startsWith("image/") && (
              <Image unoptimized width={640} height={360} src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketing-public/${asset.path}`} alt={String(asset.alt_text || "")} />
            )}
            <span className="ops-badge">{String(asset.bucket)}</span>
            <strong>{String(asset.path)}</strong>
            <p>{String(asset.alt_text || "No alternative text")}</p>
            <small>{String(asset.mime_type)} · {Math.ceil(Number(asset.byte_size) / 1024)} KB</small>
            <code>{String(asset.id)}</code>
            <div className="ops-row-actions">
              <button type="button" onClick={() => void navigator.clipboard.writeText(String(asset.id))}>Copy asset ID</button>
              {canManage && <button type="button" className="is-danger" onClick={() => void remove(asset)}>Delete unused</button>}
            </div>
          </article>
        ))}
        {!assets.length && <div className="ops-empty">No media assets yet.</div>}
      </section>
    </div>
  );
}
