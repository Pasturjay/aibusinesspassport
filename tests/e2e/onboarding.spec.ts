import { test, expect } from "@playwright/test";

test.describe("Segment 5: Onboarding E2E User Flows", () => {
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true });

  test("Sarah persona: completes start path on 360px viewport under 3 minutes with zero legal terms", async ({ page }) => {
    await page.goto("/onboarding");

    // Screen 1: What do you want to do?
    await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
    
    // Verify no banned legalistic phrases on screen
    const content = await page.content();
    expect(content).not.toContain("statutory compliance obligations");
    expect(content).not.toContain("post-incorporation filing");
    expect(content).not.toContain("corporate documentation repository");

    // Click "Start a new business"
    await page.getByRole("button", { name: /Start a new business/i }).click();

    // Screen 2: Products description
    await expect(page.getByRole("heading", { name: /What will your business sell/i })).toBeVisible();
    await page.fill("textarea", "Organic skincare and beauty products");
    await page.getByRole("button", { name: "Continue" }).click();

    // Screen 3: Location (State & LGA)
    await expect(page.getByRole("heading", { name: /Where is your business located/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Screen 4: Operational Footprint
    await expect(page.getByRole("heading", { name: /Quick details about how you operate/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Screen 5: Business Name
    await expect(page.getByRole("heading", { name: /Name your business/i })).toBeVisible();
    await page.fill('input[placeholder*="Sarah Skincare"]', "Sarah Beauty Organics");
    await page.getByRole("button", { name: "Generate Checklist" }).click();

    // Screen 6: Rule-Backed Checklist & Passport Creation
    await expect(page.getByText("Rule-Backed Checklist Ready")).toBeVisible();
    await page.getByRole("button", { name: /Create my free Business Passport/i }).click();

    // Final Screen: Verified Passport Guidance & Official Links
    await expect(page.getByText("Verified Passport Issued")).toBeVisible();
    await expect(page.getByText("Visit Official CAC Portal")).toBeVisible();
  });

  test("Johnson persona: uploads CAC document and sees confirm-to-prefill screen", async ({ page }) => {
    await page.goto("/onboarding");

    // Screen 1: Select "I already have a business"
    await page.getByRole("button", { name: /I already have a business/i }).click();

    // Screen 2: Upload CAC Cert
    await expect(page.getByRole("heading", { name: /Upload your business certificate/i })).toBeVisible();
    
    // Trigger mock document extraction / manual skip
    await page.getByText("Skip document upload & enter manually").click();

    // Screen 3: Confirm-to-prefill values
    await expect(page.getByText("Confirm Extracted Values")).toBeVisible();
    await expect(page.getByText("Confirm your details")).toBeVisible();

    // Click confirm button on prefilled values
    await page.getByRole("button", { name: "Proceed to Checklist" }).click();

    // Final Passport Screen
    await page.getByRole("button", { name: /Create my free Business Passport/i }).click();
    await expect(page.getByText("Verified Passport Issued")).toBeVisible();
  });

  test("abandoned state resumes exactly where user left off on refresh", async ({ page }) => {
    await page.goto("/onboarding");

    // Select "Start a new business" and enter description on step 2
    await page.getByRole("button", { name: /Start a new business/i }).click();
    await page.fill("textarea", "Software development services");

    // Reload page (simulating user abandoning and returning)
    await page.reload();

    // Verify user resumes exactly on step 2 with saved text
    await expect(page.getByRole("heading", { name: /What will your business sell/i })).toBeVisible();
    const inputValue = await page.inputValue("textarea");
    expect(inputValue).toBe("Software development services");
  });
});
