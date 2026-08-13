import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/server-security",()=>({consumeRateLimit:vi.fn().mockResolvedValue({allowed:true,configured:true}),logServerError:vi.fn()}));

const webhookSecret="test-only-secret-that-is-at-least-32-characters";

import { POST as purchase } from "@/app/api/premium/purchase/route";

describe("Premium purchase activation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PREMIUM_PURCHASE_WEBHOOK_SECRET = webhookSecret;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-service-role";
    rpc.mockResolvedValue({ data: { status: "active" }, error: null });
  });

  it("rejects unsigned purchase events before privileged access", async () => {
    const response = await purchase(new Request("http://localhost/api/premium/purchase", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("activates only a signed confirmed event with a provider deduplication reference", async () => {
    const body = JSON.stringify({ student_id: "10000000-0000-4000-8000-000000000001", provider: "configured-provider", reference: "purchase-42", status: "confirmed" });
    const signature = createHmac("sha256",webhookSecret).update(body).digest("hex");
    const response = await purchase(new Request("http://localhost/api/premium/purchase", { method: "POST", body, headers: { "x-pgs-signature": signature } }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("activate_premium_purchase", expect.objectContaining({ target_student: "10000000-0000-4000-8000-000000000001", provider_name: "configured-provider", purchase_reference: "purchase-42" }));
  });

  it("fails closed while provider credentials are absent", async () => {
    delete process.env.PREMIUM_PURCHASE_WEBHOOK_SECRET;
    const response = await purchase(new Request("http://localhost/api/premium/purchase", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
  });
});
