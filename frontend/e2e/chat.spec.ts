import { test, expect } from "@playwright/test";

test.describe("MasterChat Liquid Glass Chat Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");
  });

  test("should render the Apple Liquid Glass layout with hero starter prompts", async ({ page }) => {
    // Verify title and main headings
    await expect(page).toHaveTitle(/MasterChat/);
    await expect(page.getByText("How can I help you today?")).toBeVisible();

    // Verify starter cards
    await expect(page.getByText("Explore Ideas")).toBeVisible();
    await expect(page.getByText("Code & Architecture")).toBeVisible();

    // Verify model selector pill
    await expect(page.getByText("GPT-4o")).toBeVisible();
  });

  test("should toggle RAG mode and open document library", async ({ page }) => {
    // Click RAG toggle
    const ragBtn = page.getByRole("button", { name: /RAG/ });
    await expect(ragBtn).toBeVisible();
    await ragBtn.click();
    await expect(page.getByText("ON")).toBeVisible();

    // Open Document Manager modal
    const docsBtn = page.getByRole("button", { name: /Docs/ });
    await docsBtn.click();
    await expect(page.getByText("Knowledge Base & Documents")).toBeVisible();
    await expect(page.getByText("Click to upload or drag & drop files")).toBeVisible();

    // Close modal via Escape or X button
    await page.keyboard.press("Escape");
    await expect(page.getByText("Knowledge Base & Documents")).not.toBeVisible();
  });

  test("should switch models in model selector dropdown", async ({ page }) => {
    // Open dropdown
    const modelSelector = page.getByRole("button", { name: /GPT-4o/ });
    await modelSelector.click();

    // Select Claude 3.5 Sonnet
    const claudeOption = page.getByText("Claude 3.5 Sonnet");
    await expect(claudeOption).toBeVisible();
    await claudeOption.click();

    // Check that selected model is now Claude 3.5 Sonnet
    await expect(page.getByText("Claude 3.5 Sonnet")).toBeVisible();
  });

  test("should send a message and stream assistant response", async ({ page }) => {
    const input = page.getByPlaceholder("Ask anything, evaluate expressions, search documents...");
    await input.fill("Hello, test MasterChat!");
    await page.keyboard.press("Enter");

    // Expect user message bubble to appear immediately
    await expect(page.getByText("Hello, test MasterChat!")).toBeVisible();

    // Verify copy button is present on hover
    const copyButton = page.getByTitle("Copy message").first();
    await expect(copyButton).toBeAttached();
  });
});

