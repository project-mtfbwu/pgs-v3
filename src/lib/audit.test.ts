import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/lib/actor-context";
import { auditActorKind, sanitizeAuditMetadata } from "@/lib/audit";

describe("canonical audit helper", () => {
  it("derives actor kind from Phase 4A context rather than a client role label", () => {
    expect(auditActorKind({authenticated:false,user:null,student:null,staff:null})).toBe("anonymous");
    expect(auditActorKind({
      authenticated:true,user:{id:"student"} as never,
      student:{profile:{} as never},staff:null
    })).toBe("student");
    expect(auditActorKind({
      authenticated:true,user:{id:"staff"} as never,
      student:null,staff:{roles:["mentor"]} as never
    })).toBe("staff");
    expect(auditActorKind({
      authenticated:true,user:{id:"unclassified"} as never,
      student:null,staff:null
    } as ActorContext)).toBe("anonymous");
  });

  it("allow-lists bounded metadata and drops sensitive or structured payloads", () => {
    const metadata=sanitizeAuditMetadata({
      permission_required:"roles.manage",
      reason_code:"permission_denied",
      route:"x".repeat(300),
      authorization:"Bearer secret",
      document_body:"private content",
      nested:{password:"secret"}
    } as never);
    expect(metadata).toEqual({
      permission_required:"roles.manage",
      reason_code:"permission_denied",
      route:"x".repeat(255)
    });
    expect(JSON.stringify(metadata)).not.toMatch(/secret|password|document_body|authorization/);
  });
});
