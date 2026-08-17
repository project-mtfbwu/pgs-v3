"use client";
import { useRef, useState } from "react";
import type { AdminEntity, AdminField, AdminRelation } from "@/lib/admin-registry";

type Row = Record<string, unknown>;
export type MediaOption = { id: string; path: string; alt_text: string | null; mime_type: string; bucket: string };
export type RelationOptions = Partial<Record<AdminRelation, Array<{ id: number; label: string }>>>;
export type TagOption = { id: number; label: string };

function shown(key: string, value: unknown): string {
  if (typeof value === "boolean") {
    if (key === "published") return value ? "Published" : "Draft";
    if (key === "featured") return value ? "Featured" : "Not featured";
    if (key === "active") return value ? "Active" : "Inactive";
    return value ? "Yes" : "No";
  }
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function publicationStatus(livePublished: boolean, hasDraft: boolean): string {
  if (livePublished && hasDraft) return "Published · Draft changes";
  if (livePublished) return "Published";
  return "Draft";
}

function catalogPreviewHref(entityKey: string, entityId: unknown, revisionId: unknown): string | null {
  if (entityKey === "universities" || entityId == null || typeof revisionId !== "string" || !revisionId) return null;
  return `/api/admin/catalog/preview?entity=${entityKey}&id=${entityId}&revision=${revisionId}`;
}

function datetimeValue(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toISOString().slice(0, 16);
}

function FieldControl({
  field,
  editing,
  mediaAssets,
  relationOptions,
  locked
}: {
  field: AdminField;
  editing: Row | null;
  mediaAssets: MediaOption[];
  relationOptions: RelationOptions;
  locked: boolean;
}) {
  const current = editing?.[field.key];
  if (field.media) {
    return (
      <div className="ops-media-field">
        <select name={field.key} defaultValue={String(current ?? "")} disabled={locked} aria-label={field.label}>
          <option value="">No media</option>
          {mediaAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {(asset.alt_text || asset.path).slice(0, 80)} ({asset.mime_type})
            </option>
          ))}
        </select>
        {!locked && (
          <label className="ops-media-upload-inline">
            <span>Upload new file</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                const select = event.currentTarget.form?.elements.namedItem(field.key);
                if (!file || !(select instanceof HTMLSelectElement)) return;
                const data = new FormData();
                data.set("file", file);
                data.set("bucket", "marketing-public");
                data.set("alt_text", file.name.replace(/\.[^.]+$/, "").slice(0, 500));
                const response = await fetch("/api/admin/media", { method: "POST", body: data });
                const result = await response.json() as { id?: string; message?: string };
                if (!response.ok || !result.id) {
                  event.currentTarget.setCustomValidity(result.message ?? "Unable to upload.");
                  event.currentTarget.reportValidity();
                  return;
                }
                const option = new Option(file.name, result.id, true, true);
                select.add(option);
              }}
            />
          </label>
        )}
      </div>
    );
  }
  if (field.relation) {
    const options = relationOptions[field.relation] ?? [];
    return (
      <select name={field.key} required={field.required} defaultValue={String(current ?? "")} disabled={locked}>
        <option value="">None</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea name={field.key} maxLength={field.max} required={field.required} defaultValue={String(current ?? "")} rows={6} disabled={locked} />;
  }
  if (field.type === "select") {
    return (
      <select name={field.key} required={field.required} defaultValue={String(current ?? "")} disabled={locked}>
        <option value="">Select…</option>
        {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    );
  }
  if (field.type === "boolean") {
    return <input name={field.key} type="checkbox" defaultChecked={current === true} disabled={locked} />;
  }
  const inputType = field.type === "datetime" ? "datetime-local" : field.type;
  const defaultValue = field.type === "datetime" ? datetimeValue(current) : String(current ?? "");
  return <input name={field.key} type={inputType} required={field.required} maxLength={field.max} defaultValue={defaultValue} disabled={locked} />;
}

export function AdminCrudManager({
  entity,
  rows,
  canManage,
  canPublish = true,
  mediaAssets = [],
  relationOptions = {},
  draftEnabled = false,
  tagOptions = []
}: {
  entity: AdminEntity;
  rows: Row[];
  canManage: boolean;
  canPublish?: boolean;
  mediaAssets?: MediaOption[];
  relationOptions?: RelationOptions;
  draftEnabled?: boolean;
  tagOptions?: TagOption[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [message, setMessage] = useState("");
  const [listNeedsRefresh, setListNeedsRefresh] = useState(false);
  const endpoint = `/api/admin/${entity.permissionDomain}/${entity.key}`;
  const publishedLock = !draftEnabled && entity.permissionDomain === "catalog" && Boolean(editing && editing.published === true && !canPublish);
  const publishLabel = `${entity.permissionDomain}.publish`;
  function open(row: Row | null) {
    setEditing(row);
    setMessage("");
    dialog.current?.showModal();
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishedLock) return setMessage(`${publishLabel} is required to change published catalog content.`);
    setMessage("Saving…");
    const data = new FormData(event.currentTarget);
    const values: Row = {};
    for (const field of entity.fields) {
      if (draftEnabled && field.key === "published") continue;
      const lockField = publishedLock || (field.key === "published" && !canPublish);
      if (lockField && field.type === "boolean") {
        values[field.key] = editing?.[field.key] === true;
        continue;
      }
      if (field.type === "boolean") values[field.key] = data.get(field.key) === "on";
      else values[field.key] = data.get(field.key) ?? "";
    }
    if (draftEnabled) {
      values.action = "save-draft";
      values.tag_ids = data.getAll("tag_ids").map(Number);
      values.revision_note = data.get("revision_note") ?? "";
    }
    if (editing) values.id = editing[entity.idKey];
    const response = await fetch(draftEnabled ? `${endpoint}/drafts` : endpoint, { method: draftEnabled ? "POST" : editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { message?: string; id?: string | number; revision_id?: string };
    if (!response.ok) return setMessage(result.message ?? "Unable to save.");
    if (!draftEnabled) {
      window.location.reload();
      return;
    }
    const savedId = result.id ?? editing?.[entity.idKey];
    setEditing({
      ...(editing ?? {}),
      ...Object.fromEntries(entity.fields.filter((field) => field.key !== "published").map((field) => [field.key, values[field.key]])),
      [entity.idKey]: savedId,
      _draft_id: result.revision_id ?? editing?._draft_id,
      _live_published: editing?._live_published === true,
      _tag_ids: Array.isArray(values.tag_ids) ? values.tag_ids : editing?._tag_ids
    });
    setListNeedsRefresh(true);
    setMessage("Draft saved. Public visitors still see published content.");
  }
  async function publication(row: Row, action: "publish" | "unpublish") {
    setMessage(action === "publish" ? "Publishing approved draft…" : "Hiding public content…");
    const response = await fetch(`${endpoint}/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "publish"
        ? { action, revision_id: row._draft_id }
        : { action, id: row[entity.idKey] })
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) return setMessage(result.message ?? "Unable to change publication.");
    window.location.reload();
  }
  async function remove(row: Row) {
    if (!window.confirm(`Delete this ${entity.label.toLowerCase()} record? Published or referenced records must be unpublished first.`)) return;
    const response = await fetch(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: row[entity.idKey] }) });
    const result = await response.json() as { message?: string };
    if (!response.ok) return setMessage(result.message ?? "Unable to delete.");
    window.location.reload();
  }
  const columns = [entity.idKey, ...entity.fields.slice(0, 4).map((field) => field.key)];
  return (
    <section className="ops-crud">
      <div className="ops-toolbar">
        <form method="get" role="search">
          <label>
            <span className="sr-only">Search {entity.label}</span>
            <input name="q" type="search" placeholder={`Search ${entity.label.toLowerCase()}…`} />
          </label>
          {entity.fields.some((field) => field.key === "published") && (
            <select name="state" aria-label="Publication filter">
              <option value="">All states</option>
              <option value="published">Published / active</option>
              <option value="draft">Draft / inactive</option>
            </select>
          )}
          <button>Filter</button>
        </form>
        {canManage && <button className="ops-primary" onClick={() => open(null)}>Add {entity.label.replace(/s$/i, "")}</button>}
      </div>
      <p role="status">{message}</p>
      <div className="ops-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column} scope="col">{entity.fields.find((field) => field.key === column)?.label ?? "ID"}</th>)}
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[entity.idKey])}>
                {columns.map((column) => <td key={column} data-label={entity.fields.find((field) => field.key === column)?.label ?? "ID"}>{shown(column, row[column])}</td>)}
                {canManage && (
                  <td>
                    <div className="ops-row-actions">
                      <button onClick={() => open(row)}>Edit</button>
                      {draftEnabled && row._draft_id && catalogPreviewHref(entity.key, row[entity.idKey], row._draft_id) ? (
                        <a href={catalogPreviewHref(entity.key, row[entity.idKey], row._draft_id) ?? undefined} target="_blank" rel="noopener noreferrer">Preview ↗</a>
                      ) : null}
                      {draftEnabled && row._draft_id && canPublish ? (
                        <button className="ops-primary" onClick={() => void publication(row, "publish")}>Publish</button>
                      ) : null}
                      {draftEnabled && canPublish && row._live_published === true && (
                        <button onClick={() => void publication(row, "unpublish")}>Hide from public</button>
                      )}
                      <button className="is-danger" onClick={() => void remove(row)}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + (canManage ? 1 : 0)}>
                  <div className="ops-empty"><strong>No records found</strong><span>Adjust the filters or add the first approved record.</span></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <dialog ref={dialog} className="ops-dialog" onClose={() => {
        setEditing(null);
        if (listNeedsRefresh) window.location.reload();
      }}>
        <form onSubmit={save}>
          <header>
            <div>
              <span>{editing ? "Edit" : "Create"}</span>
              <h2>{entity.label}</h2>
              {draftEnabled ? (
                <p className="ops-publication-status">{publicationStatus(editing?._live_published === true, Boolean(editing?._draft_id))}</p>
              ) : null}
            </div>
            <button type="button" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button>
          </header>
          {draftEnabled && <p className="ops-form-note" role="note">Save Draft keeps this editor open. Preview opens the real public page in a new tab. Publish is the only action that changes what visitors see.</p>}
          {publishedLock && <p className="ops-form-note" role="status">This record is published. {publishLabel} is required to change public catalog content.</p>}
          {!canPublish && !editing && <p className="ops-form-note">You can create drafts. Publishing requires {publishLabel}.</p>}
          <div className="ops-form-grid">
            {entity.fields.filter((field) => !(draftEnabled && field.key === "published")).map((field) => {
              const lockField = publishedLock || (field.key === "published" && !canPublish);
              return (
                <label key={`${String(editing?.[entity.idKey] ?? "new")}-${field.key}`} className={field.type === "textarea" || field.media ? "is-wide" : ""}>
                  <span>{field.label}{field.required ? " *" : ""}</span>
                  <FieldControl field={field} editing={editing} mediaAssets={mediaAssets} relationOptions={relationOptions} locked={lockField} />
                </label>
              );
            })}
            {draftEnabled && tagOptions.length ? (
              <fieldset className="is-wide ops-tag-picker">
                <legend>Tags</legend>
                {tagOptions.map((tag) => (
                  <label key={tag.id}>
                    <input name="tag_ids" type="checkbox" value={tag.id} defaultChecked={Array.isArray(editing?._tag_ids) && editing._tag_ids.includes(tag.id)} />
                    <span>{tag.label}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            {draftEnabled ? <label className="is-wide"><span>Revision note</span><input name="revision_note" maxLength={500} /></label> : null}
          </div>
          <p role="status">{message}</p>
          <footer className="ops-editor-toolbar">
            {draftEnabled ? (
              <div className="ops-editor-actions">
                <button className="ops-primary" disabled={publishedLock}>Save Draft</button>
                {catalogPreviewHref(entity.key, editing?.[entity.idKey], editing?._draft_id) ? (
                  <a className="ops-preview-button" href={catalogPreviewHref(entity.key, editing?.[entity.idKey], editing?._draft_id) ?? undefined} target="_blank" rel="noopener noreferrer">Preview ↗</a>
                ) : entity.key === "universities" ? null : (
                  <button type="button" className="ops-preview-button" disabled aria-describedby="ops-preview-hint">Preview ↗</button>
                )}
                {canPublish ? (
                  <button type="button" className="ops-primary" disabled={!editing?._draft_id} onClick={() => editing && void publication(editing, "publish")}>Publish</button>
                ) : null}
                {entity.key !== "universities" && !catalogPreviewHref(entity.key, editing?.[entity.idKey], editing?._draft_id) ? (
                  <span id="ops-preview-hint" className="ops-preview-hint">Save draft to preview</span>
                ) : null}
              </div>
            ) : (
              <button className="ops-primary" disabled={publishedLock}>{editing ? "Save changes" : "Create record"}</button>
            )}
            <button type="button" onClick={() => dialog.current?.close()}>Cancel</button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
