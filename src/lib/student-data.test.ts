import { beforeEach,describe,expect,it,vi } from "vitest";
import type { User } from "@supabase/supabase-js";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/staff-preview-server",()=>({
  getActiveStudentPreviewTargetId: async () => null,
  loadPreviewStudentAvatarUrl: async () => "/assets/img/default-avatar.png"
}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/student-data";

const mockedClient=vi.mocked(createSupabaseServerClient);
const user={id:"10000000-0000-4000-8000-000000000001",user_metadata:{full_name:"Must not be fabricated"}} as unknown as User;

describe("authoritative student data",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("returns null when no genuine profile row exists",async()=>{
    const maybeSingle=vi.fn().mockResolvedValue({data:null});
    const eq=vi.fn().mockReturnValue({maybeSingle});
    const select=vi.fn().mockReturnValue({eq});
    mockedClient.mockResolvedValue({from:vi.fn().mockReturnValue({select})} as never);
    await expect(getOwnProfile(user)).resolves.toBeNull();
  });
});
