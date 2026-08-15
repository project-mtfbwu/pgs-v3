import { expect,test } from "@playwright/test";

const emptyState={cookies:[],origins:[]};

test("anonymous users never receive the internal operations shell",async({page})=>{
  await page.goto("/admin/catalog/courses",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.locator(".ops-app")).toHaveCount(0);
});

test.describe("preview read-only staff workflow",()=>{
  const readOnlyState=process.env.PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE??process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE;
  test.use({storageState:readOnlyState??emptyState});
  test.skip(!readOnlyState,"Supply an isolated preview read-only staff storage state.");
  test("Read-only staff has catalog access without mutation authority",async({page,request})=>{
    await page.goto("/admin/catalog/courses");
    await expect(page.getByRole("heading",{name:"Courses"})).toBeVisible();
    await expect(page.getByRole("button",{name:/add/i})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Viewer attack",slug:"viewer-attack"}});
    expect(response.status()).toBe(403);
  });
  test("Read-only staff sees the minimal directory but no private workspace",async({page})=>{
    await page.goto("/admin/students");
    await expect(page.getByRole("heading",{name:"Student operations"})).toBeVisible();
    await expect(page.getByRole("link",{name:/open workspace/i})).toHaveCount(0);
    await expect(page.locator("tbody tr").first()).toContainText("directory");
    const studentId=process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId,"Supply a Premium student fixture UUID.");
    const denied=await page.goto(`/admin/students/${studentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("preview Mentor workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE,"Supply an isolated preview Mentor storage state.");
  test("Mentor enters assigned-student operations without catalog access",async({page,request})=>{
    await page.goto("/admin/students");
    await expect(page.getByRole("heading",{name:"Assigned student workspaces"})).toBeVisible();
    await expect(page.getByRole("link",{name:"Catalog"})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Mentor attack",slug:"mentor-attack"}});
    expect(response.status()).toBe(403);
  });
  test("Mentor can inspect only the assigned Premium workspace",async({page})=>{
    const assignedStudentId=process.env.PGS_ASSIGNED_STUDENT_ID;
    const unassignedStudentId=process.env.PGS_UNASSIGNED_STUDENT_ID;
    test.skip(!assignedStudentId||!unassignedStudentId,"Supply assigned and unassigned Premium fixture UUIDs.");
    await page.goto(`/admin/students/${assignedStudentId}`);
    await expect(page.getByRole("heading",{name:"Fixture student-a"})).toBeVisible();
    await expect(page.getByRole("region",{name:"Assigned student's shared board"})).toBeVisible();
    for(const stage of ["Draft","In Progress","Completed"])await expect(page.getByRole("heading",{name:stage})).toBeVisible();
    const workspaceData=page.locator(".staff-workspace-data");
    for(const region of ["Comments & alerts","Reviews","Notes","Documents"]){
      await expect(workspaceData.getByRole("heading",{name:region,exact:true})).toBeVisible();
    }
    const denied=await page.goto(`/admin/students/${unassignedStudentId}`);
    expect(denied?.status()).toBe(404);
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
    await expect(page.getByRole("heading",{name:"Invite or assign staff access"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Save access"})).toBeVisible();
  });
  test("Super Admin sees the canonical and historical audit read path",async({page,request})=>{
    const selfId=process.env.PGS_SUPER_ADMIN_USER_ID;
    test.skip(!selfId,"Supply the Phase 4A Super Admin fixture UUID.");
    const denial=await request.post("/api/admin/staff",{data:{action:"assign",user_id:selfId,role:"admin",status:"active",reason:"self denial proof"}});
    expect(denial.status()).toBe(403);
    await page.goto("/admin/audit");
    await expect(page.getByRole("heading",{name:"Activity and security audit"})).toBeVisible();
    await expect(page.getByText(/staff\.access\.denied \(denied\)/).first()).toBeVisible();
    await expect(page.locator(".ops-badge").first()).toBeVisible();
  });
});
