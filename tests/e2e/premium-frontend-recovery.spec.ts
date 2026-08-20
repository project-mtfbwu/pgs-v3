import { expect, test } from "@playwright/test";

test.describe("Premium frontend recovery runtime matrix", () => {
  test.describe.configure({ timeout: 120_000 });

  test("proves real Premium, real Standard, then staff authoring", async ({ browser }) => {
    const premiumState = process.env.PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE;
    const standardState = process.env.PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE;
    const staffState = process.env.PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE;
    const premiumStudentId = process.env.PGS_PREMIUM_STUDENT_ID;
    test.skip(!premiumState || !standardState || !staffState || !premiumStudentId,
      "Supply Premium, Standard, Super Admin, and Premium student fixtures.");

    const premiumContext = await browser.newContext({ storageState: premiumState });
    const premium = await premiumContext.newPage();
    await premium.goto("/student/dashboard");
    await expect(premium).toHaveURL(/\/student\/dashboard$/);
    await expect(premium.locator('.developer-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await expect(premium.getByText("Your Quick Dashboard overview", { exact: true })).toBeVisible();
    await expect(premium.getByRole("heading", { name: "Where You Stand" })).toBeVisible();
    await expect(premium.getByRole("heading", { name: "Comments", exact: true })).toBeVisible();
    await expect(premium.getByRole("heading", { name: "Upcoming Events", exact: true })).toBeVisible();
    await expect(premium.locator(".premium-mentor-card")).toHaveCount(0);
    await expect(premium.locator(".premium-kanban")).toHaveCount(0);
    const notificationTrigger = premium.getByRole("button", { name: /Notifications/ }).first();
    await expect(notificationTrigger).toBeVisible();
    await notificationTrigger.click();
    await expect(notificationTrigger).toHaveAttribute("aria-expanded", "true");
    await premium.keyboard.press("Escape");
    await expect(notificationTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(notificationTrigger).toBeFocused();

    await premium.goto("/feed_track_progress");
    await expect(premium.locator(".developer-progress-page .premium-kanban")).toBeVisible();
    await expect(premium.locator(".premium-kanban-column")).toHaveCount(4);
    await premium.goto("/upload_your_doc");
    await expect(premium.getByRole("heading", { name: "upload your docs" })).toBeVisible();
    await expect(premium.getByText(/under 50MB/i)).toBeVisible();
    await premium.goto("/saved");
    await expect(premium.locator('.developer-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await premium.goto("/student/profile");
    await expect(premium.locator('.developer-student-shell[data-student-state="authenticated_premium"]')).toBeVisible();
    await premium.goto("/notifications");
    await expect(premium.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();

    const standardContext = await browser.newContext({ storageState: standardState });
    const standard = await standardContext.newPage();
    await standard.goto("/");
    await expect(standard.locator('[data-legacy-page="home"]')).toHaveAttribute("data-student-state", "authenticated_standard");
    await standard.goto("/dashboard");
    await expect(standard).toHaveURL(/\/student\/dashboard$/);
    await expect(standard.locator('[data-legacy-page="student-dashboard"]')).toHaveAttribute("data-student-state", "authenticated_standard");
    await expect(standard.locator(".developer-premium-dashboard")).toHaveCount(0);
    for (const [route, page] of [["/feed_track_progress", "progress-locked"], ["/upload_your_doc", "documents-locked"]] as const) {
      await standard.goto(route);
      await expect(standard.locator(`[data-legacy-page="${page}"]`)).toHaveAttribute("data-student-state", "authenticated_standard");
    }
    const deniedAuthoring = await standardContext.request.patch(`/api/staff/students/${premiumStudentId}/workspace/profile`, {
      data: { universities_applied: 99 }
    });
    expect(deniedAuthoring.status()).toBe(403);

    const staffContext = await browser.newContext({ storageState: staffState });
    const authored = await staffContext.request.patch(`/api/staff/students/${premiumStudentId}/workspace/profile`, {
      data: {
        pathway_label: "Medical",
        intake_label: "September 2027",
        universities_applied: 4,
        offers_received: 2,
        visa_status: "applied",
        tuition_receipt_uploaded: true,
        onboarding_percentage: 72,
        onboarding_checklist: [{ text: "Complete profile", checked: true }],
        feedback_session_title: "Feedback session 1",
        feedback_session_items: [{ text: "Review shortlist", checked: false }],
        documents_tracker: { SOP: { count: 2, is_red: false } },
        currently_working_on: ["Statement of Purpose"],
        future_tasks: ["Visa documents"]
      }
    });
    expect(authored.status()).toBe(200);
    const staff = await staffContext.newPage();
    await staff.goto(`/admin/students/${premiumStudentId}`);
    await expect(staff.getByText("Update Premium dashboard", { exact: true })).toBeVisible();

    await premium.goto("/dashboard");
    await expect(premium).toHaveURL(/\/student\/dashboard$/);
    await expect(premium.getByText("72%", { exact: true })).toBeVisible();
    await expect(premium.locator("#currently-working-on")).toContainText("Statement of Purpose");
    await expect(premium.getByText("Visa documents", { exact: true })).toBeVisible();
    await expect(premium.getByText("Feedback session 1", { exact: true })).toBeVisible();

    await staffContext.close();
    await standardContext.close();
    await premiumContext.close();
  });
});
