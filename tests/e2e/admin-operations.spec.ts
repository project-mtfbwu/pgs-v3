import { expect,test } from "@playwright/test";

const emptyState={cookies:[],origins:[]};

test("anonymous users never receive the internal operations shell",async({page})=>{
  await page.goto("/admin/catalog/courses",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.locator("[data-operations-shell]")).toHaveCount(0);
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
  test("Read-only staff sees the minimal directory but no private workspace",async({page,request})=>{
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('[data-scoreboard-scope="restricted"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Your Operations pulse."})).toBeVisible();
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await expect(page.getByText("Visible students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Active team members",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:/save|assign|create/i})).toHaveCount(0);
    await page.goto("/admin/students");
    await expect(page.getByRole("heading",{name:"Student Registry"})).toBeVisible();
    await expect(page.getByRole("link",{name:/open workspace/i})).toHaveCount(0);
    await expect(page.locator("tbody tr").first()).toContainText("directory");
    const studentId=process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId,"Supply a Premium student fixture UUID.");
    const directApi=await request.patch(`/api/staff/students/${studentId}/workspace/tasks`,{data:{id:"00000000-0000-4000-8000-000000000000",title:"forged"}});
    expect(directApi.status()).toBe(403);
    const denied=await page.goto(`/admin/students/${studentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("preview Mentor workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE,"Supply an isolated preview Mentor storage state.");
  test("Mentor enters assigned-student operations without catalog access",async({page,request})=>{
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('[data-scoreboard-scope="assigned_students"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Your Operations pulse."})).toBeVisible();
    await expect(page.getByText("Assigned students",{exact:true})).toBeVisible();
    await expect(page.getByText("Visible students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Premium students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Active team members",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await page.goto("/admin/students");
    await expect(page.getByRole("heading",{name:"My Students"})).toBeVisible();
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
    await expect(page.getByRole("navigation",{name:"Operations navigation"}).first()).toBeVisible();
    await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Your Operations pulse."})).toBeVisible();
    await expect(page.getByText("Visible students",{exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await expect(page.getByRole("link",{name:"Sign out"})).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('nav[aria-label="Operations navigation"]:visible')).toBeVisible();
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
  test("Super Admin sees the canonical audit read path",async({page,request})=>{
    const selfId=process.env.PGS_SUPER_ADMIN_USER_ID;
    test.skip(!selfId,"Supply the Phase 4A Super Admin fixture UUID.");
    const denial=await request.post("/api/admin/staff",{data:{action:"assign",user_id:selfId,role:"admin",status:"active",reason:"self denial proof"}});
    expect(denial.status()).toBe(403);
    await page.goto("/admin/audit");
    await expect(page.getByRole("heading",{name:"Operations activity"})).toBeVisible();
    await expect(page.getByText("staff.access.denied").first()).toBeVisible();
    await expect(page.getByText("denied",{exact:true}).first()).toBeVisible();
  });
  test("Super Admin can open every OPS-01 checkpoint route",async({page})=>{
    const routes=[
      ["/admin","Your Operations pulse."],
      ["/admin/students","Student Registry"],
      ["/admin/staff","Staff identities and access"],
      ["/admin/notifications","Staff notifications"],
      ["/admin/audit","Operations activity"]
    ] as const;
    for(const [route,heading] of routes){
      await page.goto(route);
      await expect(page.getByRole("heading",{name:heading})).toBeVisible();
      if(route==="/admin")await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
    }
  });
});
