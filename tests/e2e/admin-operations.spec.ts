import { expect,test } from "@playwright/test";

const emptyState={cookies:[],origins:[]};

test("anonymous users never receive the internal operations shell",async({page})=>{
  await page.goto("/admin/catalog/courses",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.locator(".ops-app")).toHaveCount(0);
});

test.describe("preview Viewer workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE,"Supply an isolated preview Viewer storage state.");
  test("Viewer has read-only catalog access",async({page,request})=>{
    await page.goto("/admin/catalog/courses");
    await expect(page.getByRole("heading",{name:"Courses"})).toBeVisible();
    await expect(page.getByRole("button",{name:/add/i})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Viewer attack",slug:"viewer-attack"}});
    expect(response.status()).toBe(403);
  });
});

test.describe("preview Mentor workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE,"Supply an isolated preview Mentor storage state.");
  test("Mentor enters assigned-student operations without catalog access",async({page,request})=>{
    await page.goto("/admin/students");
    await expect(page.getByRole("heading",{name:/students/i})).toBeVisible();
    await expect(page.getByRole("link",{name:"Catalog"})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Mentor attack",slug:"mentor-attack"}});
    expect(response.status()).toBe(403);
  });
});

test.describe("preview Admin workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE,"Supply an isolated preview Admin storage state.");
  test("Admin receives the operations shell but not role governance",async({page,request})=>{
    await page.goto("/admin");
    await expect(page.getByRole("navigation",{name:"Staff navigation"})).toBeVisible();
    await expect(page.getByRole("heading",{name:/clear desk/i})).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole("button",{name:/menu/i})).toBeVisible();
    const response=await request.post("/api/admin/staff",{data:{action:"assign",userId:"00000000-0000-0000-0000-000000000000",role:"super_admin"}});
    expect(response.status()).toBe(403);
  });
});

test.describe("preview Super Admin workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE,"Supply an isolated preview Super Admin storage state.");
  test("Super Admin sees staff role governance",async({page})=>{
    await page.goto("/admin/staff");
    await expect(page.getByRole("heading",{name:/staff access/i})).toBeVisible();
    await expect(page.getByRole("button",{name:/invite staff/i})).toBeVisible();
  });
});
