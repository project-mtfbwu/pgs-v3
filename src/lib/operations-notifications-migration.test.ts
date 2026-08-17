import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817075519_ops08_notifications_activity.sql",
  "utf8"
);

describe("OPS-08 recipient and event contract", () => {
  it("evolves the one notification domain instead of creating a staff ledger", () => {
    expect(migration).toContain("alter table public.notifications");
    expect(migration).toContain("recipient_kind");
    expect(migration).toContain("recipient_user_id");
    expect(migration).not.toMatch(/create table public\.staff_notifications/i);
    expect(migration).not.toMatch(/create table public\..*activity/i);
  });

  it("enforces recipient-owned staff reads and mutations in the database", () => {
    expect(migration).toContain("recipient_user_id = (select auth.uid())");
    expect(migration).toContain("recipient_user_id = actor");
    expect(migration).toContain("recipient_user_id = target_recipient");
    expect(migration).toContain("private.has_staff_permission('overview.read')");
    expect(migration).toContain("target_action not in ('read', 'archive')");
  });

  it("maps the approved actionable events without broad audit fan-out", () => {
    expect(migration).toContain("notify_premium_awaiting_mentor");
    expect(migration).toContain("notify_staff_target_change");
    expect(migration).toContain("notify_staff_workspace_comment");
    expect(migration).toContain("notify_staff_document_scan");
    expect(migration).toContain("refresh_staff_due_notifications");
    expect(migration).not.toContain("after insert on public.audit_events");
  });

  it("keeps Operations Activity on immutable audit_events and removes IDs from its result", () => {
    expect(migration).toContain("from public.audit_events event");
    expect(migration).toContain("'Deleted user'");
    expect(migration).toContain("'Unknown user'");
    expect(migration).not.toMatch(/returns table\([\s\S]*target_id text,[\s\S]*\)\nlanguage plpgsql\nstable\nsecurity definer\nset search_path = ''\nas \$\$\ndeclare\n  safe_domain/);
  });
});
