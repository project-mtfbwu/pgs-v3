import { describe, expect, it, vi } from "vitest";
import { signOutAndNavigate } from "@/lib/logout-navigation";

describe("signOutAndNavigate", () => {
  it("waits for sign-out and performs a fresh logged-out document navigation", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect: "/" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));
    const replace = vi.fn();

    await signOutAndNavigate(fetcher, { origin: "https://purpleguide.test", replace });

    expect(fetcher).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(replace).toHaveBeenCalledWith("https://purpleguide.test/");
  });

  it("does not navigate when sign-out fails", async () => {
    const replace = vi.fn();

    await expect(signOutAndNavigate(
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
      { origin: "https://purpleguide.test", replace }
    )).rejects.toThrow("Logout failed");
    expect(replace).not.toHaveBeenCalled();
  });

  it("rejects an unsafe server-provided redirect", async () => {
    const replace = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect: "//attacker.test" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    await signOutAndNavigate(fetcher, { origin: "https://purpleguide.test", replace });

    expect(replace).toHaveBeenCalledWith("https://purpleguide.test/");
  });
});
