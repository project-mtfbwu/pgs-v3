import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({
  resolveActorContext:vi.fn(),
  insert:vi.fn(),
  logServerError:vi.fn(),
  requestCorrelationId:vi.fn(()=> "request-proof")
}));

vi.mock("@/lib/actor-context",()=>({resolveActorContext:mocks.resolveActorContext}));
vi.mock("@/lib/supabase/admin",()=>({
  createSupabaseAdminClient:()=>({from:()=>({insert:mocks.insert})})
}));
vi.mock("@/lib/server-security",()=>({
  logServerError:mocks.logServerError,
  requestCorrelationId:mocks.requestCorrelationId
}));

import {
  recordDeniedAuditEvent,
  recordFailedAuditEvent,
  recordPrivilegedReadAuditEvent
} from "@/lib/audit";

describe("trusted server audit writes",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requestCorrelationId.mockReturnValue("request-proof");
    mocks.resolveActorContext.mockResolvedValue({
      authenticated:true,user:{id:"staff-user"},student:null,
      staff:{roles:["admin"],permissions:new Set(["roles.manage"])}
    });
    mocks.insert.mockResolvedValue({error:null});
  });

  it("records a denied operation with server-resolved actor evidence",async()=>{
    await expect(recordDeniedAuditEvent(new Request("https://pgs.test/api/admin/staff"),{
      eventType:"staff.access.denied",sourceSubsystem:"staff",
      targetType:"staff_user",targetId:"target-user",
      metadata:{permission_required:"roles.manage",reason_code:"permission_denied"}
    })).resolves.toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      event_type:"staff.access.denied",actor_user_id:"staff-user",actor_kind:"staff",
      outcome:"denied",request_id:"request-proof"
    }));
  });

  it("does not turn a denial into authorization when audit storage fails",async()=>{
    mocks.insert.mockResolvedValue({error:{code:"storage_unavailable"}});
    await expect(recordDeniedAuditEvent(new Request("https://pgs.test/api/staff/premium"),{
      eventType:"premium.entitlement.denied",sourceSubsystem:"premium",
      targetType:"student",targetId:"student-id",
      metadata:{permission_required:"premium.manage",reason_code:"permission_denied"}
    })).resolves.toBe(false);
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "audit_event_write_failed",expect.anything(),
      expect.objectContaining({outcome:"denied"})
    );
  });

  it("best-effort records failed privileged mutations",async()=>{
    mocks.insert.mockResolvedValue({error:{code:"write_failed"}});
    await expect(recordFailedAuditEvent(new Request("https://pgs.test/api/staff/assignments"),{
      eventType:"assignment.change.failed",sourceSubsystem:"assignments",
      targetType:"student",targetId:"student-id",metadata:{reason_code:"request_failed"}
    })).resolves.toBe(false);
  });

  it("fails a sensitive document read closed when its audit write fails",async()=>{
    mocks.insert.mockResolvedValue({error:{code:"write_failed"}});
    await expect(recordPrivilegedReadAuditEvent(new Request("https://pgs.test/api/premium/documents/id"),{
      eventType:"document.accessed",sourceSubsystem:"documents",
      targetType:"student_document",targetId:"document-id"
    })).rejects.toThrow("Unable to record privileged access.");
  });

  it("records successful document access without file contents",async()=>{
    await recordPrivilegedReadAuditEvent(new Request("https://pgs.test/api/premium/documents/id"),{
      eventType:"document.accessed",sourceSubsystem:"documents",
      targetType:"student_document",targetId:"document-id",
      metadata:{route:"/api/premium/documents/[id]"}
    });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      event_type:"document.accessed",target_id:"document-id",outcome:"succeeded",
      metadata:{route:"/api/premium/documents/[id]"}
    }));
  });
});
