import { expect, test } from "@playwright/test";

test.describe("enterprise smoke", { tag: ["@smoke", "@cert"] }, () => {
  test("public home is reachable", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status(), "/").toBeLessThan(500);
  });

  test("operations surface does not 500", async ({ request }) => {
    const response = await request.get("/ops", { maxRedirects: 5 });
    expect(response.status(), "/ops").toBeLessThan(500);
  });

  test("cms surface does not 500", async ({ request }) => {
    const response = await request.get("/cms", { maxRedirects: 5 });
    expect(response.status(), "/cms").toBeLessThan(500);
  });
});
