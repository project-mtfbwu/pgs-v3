import { expect,test } from "@playwright/test";

const emptyState={cookies:[],origins:[]};

test("anonymous /ops users receive only the Operations staff login",async({page})=>{
  await page.goto("/ops",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?.*redirect=%2Fops.*surface=operations/);
  const heading=page.getByRole("heading",{name:"Sign in to Operations"});
  await expect(heading).toBeVisible();
  await expect(page.locator("[data-operations-shell]")).toHaveCount(0);
  const visualContract=await heading.evaluate((element)=>{
    const title=getComputedStyle(element);
    const surface=getComputedStyle(element.closest("main")!);
    return {fontFamily:surface.fontFamily,fontSize:title.fontSize,lineHeight:title.lineHeight};
  });
  expect(visualContract.fontFamily).toContain("Roboto");
  expect(visualContract.fontSize).toBe("28px");
  expect(visualContract.lineHeight).toBe("32px");
  const panel=await page.locator("main > section").boundingBox();
  expect(panel).not.toBeNull();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x+panel!.width).toBeLessThanOrEqual(await page.evaluate(()=>window.innerWidth));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

test("anonymous nested Operations routes preserve the exact return path",async({page})=>{
  await page.goto("/ops/students?premium=active",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?.*redirect=%2Fops%2Fstudents%3Fpremium%3Dactive.*surface=operations/);
  await expect(page.getByRole("heading",{name:"Sign in to Operations"})).toBeVisible();
});

test("the application root remains the public student product",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-legacy-page="home"]')).toBeVisible();
  await expect(page.locator("[data-operations-shell]")).toHaveCount(0);
  await expect(page.locator("[data-operations-product]")).toHaveCount(0);
});

test("only mapped core /admin routes redirect to canonical /ops URLs",async({request})=>{
  const mappings=[
    ["/admin","/ops"],
    ["/admin/students?premium=active","/ops/students?premium=active"],
    ["/admin/students/student-1","/ops/students/student-1"],
    ["/admin/staff","/ops/team"],
    ["/admin/notifications","/ops/notifications"],
    ["/admin/audit","/ops/activity"]
  ] as const;
  for(const [legacy,canonical] of mappings){
    const response=await request.get(legacy,{maxRedirects:0});
    expect(response.status(),legacy).toBe(308);
    expect(new URL(response.headers().location,"http://localhost").pathname+new URL(response.headers().location,"http://localhost").search).toBe(canonical);
  }
});

test.describe("preview read-only staff workflow",()=>{
  const readOnlyState=process.env.PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE??process.env.PLAYWRIGHT_VIEWER_STORAGE_STATE;
  test.use({storageState:readOnlyState??emptyState});
  test.skip(!readOnlyState,"Supply an isolated preview read-only staff storage state.");
  test("Read-only staff has catalog access without mutation authority",async({page,request})=>{
    await page.goto("/admin/catalog/courses");
    await expect(page).toHaveURL(/\/admin\/catalog\/courses$/);
    await expect(page.getByRole("heading",{name:"Courses"})).toBeVisible();
    await expect(page.locator("[data-operations-product]")).toHaveCount(0);
    await expect(page.getByRole("button",{name:/add/i})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Viewer attack",slug:"viewer-attack"}});
    expect(response.status()).toBe(403);
  });
  test("Read-only staff sees the minimal directory but no private workspace",async({page,request})=>{
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/ops$/);
    await expect(page.locator('[data-scoreboard-scope="restricted"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"Authorized Operations views"})).toBeVisible();
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await expect(page.getByText("Visible students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Active team members",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Recent activity"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:/save|assign|create/i})).toHaveCount(0);
    await page.goto("/ops/students");
    await expect(page.getByRole("heading",{name:"Student Registry"})).toBeVisible();
    await expect(page.getByRole("link",{name:/open workspace/i})).toHaveCount(0);
    await expect(page.getByText("PGS ID").first()).toBeVisible();
    await expect(page.getByText("directory",{exact:true})).toHaveCount(0);
    await expect(page.getByLabel("Search by name or PGS ID").first()).toBeVisible();
    await expect(page.getByRole("navigation",{name:"Student registry pagination"})).toBeVisible();
    const studentId=process.env.PGS_ASSIGNED_STUDENT_ID;
    test.skip(!studentId,"Supply a Premium student fixture UUID.");
    const directApi=await request.patch(`/api/staff/students/${studentId}/workspace/tasks`,{data:{id:"00000000-0000-4000-8000-000000000000",title:"forged"}});
    expect(directApi.status()).toBe(403);
    const denied=await page.goto(`/ops/students/${studentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("preview Mentor workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_MENTOR_STORAGE_STATE,"Supply an isolated preview Mentor storage state.");
  test("Mentor enters assigned-student operations without catalog access",async({page,request})=>{
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/ops$/);
    await expect(page.locator('[data-scoreboard-scope="assigned_students"]')).toBeVisible();
    await expect(page.getByRole("heading",{name:"My Operations pulse."})).toBeVisible();
    await expect(page.getByText("Assigned students",{exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"My students"})).toBeVisible();
    await expect(page.getByText("Visible students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Premium students",{exact:true})).toHaveCount(0);
    await expect(page.getByText("Active team members",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Recent activity"})).toHaveCount(0);
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await page.goto("/ops/students");
    await expect(page.getByRole("heading",{name:"My Students"})).toBeVisible();
    await expect(page.getByRole("columnheader",{name:"Mentor"})).toHaveCount(0);
    await expect(page.getByLabel("Mentor")).toHaveCount(0);
    await expect(page.getByLabel("Joined")).toHaveCount(0);
    await expect(page.getByRole("link",{name:"Catalog"})).toHaveCount(0);
    const response=await request.post("/api/admin/catalog/courses",{data:{title:"Mentor attack",slug:"mentor-attack"}});
    expect(response.status()).toBe(403);
  });
  test("Mentor can inspect only the assigned Premium workspace",async({page})=>{
    const assignedStudentId=process.env.PGS_ASSIGNED_STUDENT_ID;
    const unassignedStudentId=process.env.PGS_UNASSIGNED_STUDENT_ID;
    test.skip(!assignedStudentId||!unassignedStudentId,"Supply assigned and unassigned Premium fixture UUIDs.");
    await page.goto(`/ops/students/${assignedStudentId}`);
    await expect(page.getByRole("heading",{name:"Fixture student-a"})).toBeVisible();
    await expect(page.getByRole("region",{name:"Assigned student's shared board"})).toBeVisible();
    for(const stage of ["Draft","In Progress","Completed"])await expect(page.getByRole("heading",{name:stage})).toBeVisible();
    const workspaceData=page.locator(".staff-workspace-data");
    for(const region of ["Comments & alerts","Reviews","Notes","Documents"]){
      await expect(workspaceData.getByRole("heading",{name:region,exact:true})).toBeVisible();
    }
    const denied=await page.goto(`/ops/students/${unassignedStudentId}`);
    expect(denied?.status()).toBe(404);
  });
});

test.describe("preview Admin workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE,"Supply an isolated preview Admin storage state.");
  test("Admin receives the operations shell but not role governance",async({page,request})=>{
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/ops$/);
    await expect(page.getByRole("navigation",{name:"Operations navigation"}).first()).toBeVisible();
    await expect(page.locator('[data-operations-product="true"]')).toBeVisible();
    await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
    const heading=page.getByRole("heading",{name:"Your Operations pulse."});
    await expect(heading).toBeVisible();
    const visualContract=await heading.evaluate((element)=>{
      const title=getComputedStyle(element);
      const shell=getComputedStyle(element.closest("[data-operations-product]")!);
      return {fontFamily:shell.fontFamily,fontSize:title.fontSize,lineHeight:title.lineHeight};
    });
    expect(visualContract.fontFamily).toContain("Roboto");
    expect(visualContract.fontSize).toBe("28px");
    expect(visualContract.lineHeight).toBe("32px");
    await expect(page.getByText("Visible students",{exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Student status"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Recent activity"})).toBeVisible();
    await expect(page.locator("[data-operations-shell] input[type=search]")).toHaveCount(0);
    await expect(page.getByRole("link",{name:"Scoreboard"}).first()).toBeVisible();
    await expect(page.getByRole("link",{name:"Sign out"})).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/ops$/);
    await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole("button",{name:"Open operations navigation"})).toBeVisible();
    await page.getByRole("button",{name:"Open operations navigation"}).click();
    await expect(page.getByRole("dialog").getByRole("navigation",{name:"Operations navigation"})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    const response=await request.post("/api/admin/staff",{data:{action:"assign",userId:"00000000-0000-0000-0000-000000000000",role:"super_admin"}});
    expect(response.status()).toBe(403);
  });
  test("Admin registry uses a semantic table, accessible cards, and canonical plan labels",async({page})=>{
    await page.goto("/ops/students");
    await expect(page.getByRole("heading",{name:"Student Registry"})).toBeVisible();
    await expect(page.getByRole("columnheader",{name:"Email"})).toHaveCount(0);
    await expect(page.getByLabel("Plan").first()).toBeVisible();
    await expect(page.getByRole("link",{name:"Premium"})).toBeVisible();
    await expect(page.getByRole("navigation",{name:"Student registry pagination"})).toBeVisible();
    await expect(page.getByText("Previous page")).toBeVisible();
    await expect(page.getByText("Next page")).toBeVisible();
    const desktop= (page.viewportSize()?.width ?? 1440) >= 768;
    if(desktop){
      await expect(page.getByRole("columnheader",{name:"PGS ID"})).toBeVisible();
      await expect(page.locator("table thead th[scope=col]").first()).toBeVisible();
      await page.locator("body").press("Tab");
      await expect(page.locator(":focus-visible")).toHaveCount(1);
    }
    await page.setViewportSize({width:390,height:844});
    const card=page.locator(".ops-registry-card");
    if(await card.count()){
      await expect(card.first()).toBeVisible();
    }else{
      await expect(page.getByText(/No students in the registry yet\.|No students match|0 students/)).toBeVisible();
    }
    await expect(page.locator(".ops-registry-desktop table")).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await page.evaluate(()=>{document.documentElement.style.zoom="2";});
    const clipped=await page.evaluate(()=>{
      const names=[...document.querySelectorAll(".ops-registry-student-name")];
      return names.some((node)=>{
        const style=getComputedStyle(node);
        return style.overflow==="hidden" && (style.textOverflow==="ellipsis" || node.scrollHeight>node.clientHeight+2);
      });
    });
    expect(clipped).toBe(false);
  });
});

test.describe("preview Super Admin workflow",()=>{
  test.use({storageState:process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE??emptyState});
  test.skip(!process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE,"Supply an isolated preview Super Admin storage state.");
  test("Super Admin sees staff role governance",async({page})=>{
    await page.goto("/ops/team");
    await expect(page.getByRole("heading",{name:/staff access/i})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Invite or assign staff access"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Save access"})).toBeVisible();
  });
  test("Super Admin sees the canonical audit read path",async({page,request})=>{
    const selfId=process.env.PGS_SUPER_ADMIN_USER_ID;
    test.skip(!selfId,"Supply the Phase 4A Super Admin fixture UUID.");
    const denial=await request.post("/api/admin/staff",{data:{action:"assign",user_id:selfId,role:"admin",status:"active",reason:"self denial proof"}});
    expect(denial.status()).toBe(403);
    await page.goto("/ops/activity");
    await expect(page.getByRole("heading",{name:"Operations activity"})).toBeVisible();
    await expect(page.getByText("staff.access.denied").first()).toBeVisible();
    await expect(page.getByText("denied",{exact:true}).first()).toBeVisible();
  });
  test("Super Admin can open every OPS-01 checkpoint route",async({page})=>{
    const routes=[
      ["/ops","Your Operations pulse."],
      ["/ops/students","Student Registry"],
      ["/ops/team","Staff identities and access"],
      ["/ops/notifications","Staff notifications"],
      ["/ops/activity","Operations activity"]
    ] as const;
    for(const [route,heading] of routes){
      await page.goto(route);
      await expect(page.getByRole("heading",{name:heading})).toBeVisible();
      if(route==="/ops")await expect(page.locator('[data-scoreboard-scope="organization"]')).toBeVisible();
    }
  });
});
