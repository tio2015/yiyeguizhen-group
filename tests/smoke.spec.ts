/**
 * 冒烟测试 — 主站 + 茶站
 * 目标：确认页面可访问、关键内容存在、无阻断性错误
 */
import { test, expect } from "@playwright/test";

// ─── 主站 ───────────────────────────────────────────────
test.describe("主站 / 冒烟测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("页面正常加载，无网络错误", async ({ page }) => {
    const response = await page.request.get("https://yiyeguizhen.com/");
    expect(response.status()).toBe(200);
  });

  test("页面标题正确", async ({ page }) => {
    await expect(page).toHaveTitle(/一叶归真/);
  });

  test("导航栏可见", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
  });

  test("Logo 图片加载成功", async ({ page }) => {
    const logo = page.locator(".nav-logo img");
    await expect(logo).toBeVisible();
    const src = await logo.getAttribute("src");
    expect(src).toContain("logo.png");
  });

  test("Hero 区域关键文字存在", async ({ page }) => {
    await expect(page.locator(".hero-title")).toContainText("一叶归真");
    await expect(page.locator(".hero-eyebrow")).toContainText("Botanicals");
  });

  test("院士区块存在", async ({ page }) => {
    await page.locator(".academician-block").scrollIntoViewIfNeeded();
    await expect(page.locator(".academician-block")).toBeVisible();
    await expect(page.locator(".academician-name")).toContainText("刘仲华");
  });

  test("院士头像图片加载成功", async ({ page }) => {
    const portrait = page.locator(".academician-portrait img");
    await portrait.scrollIntoViewIfNeeded();
    const naturalWidth = await portrait.evaluate(
      (img: HTMLImageElement) => img.naturalWidth
    );
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test("选择赛道区块存在两个入口", async ({ page }) => {
    await expect(page.locator(".choose-card")).toHaveCount(2);
  });

  test("Footer 可见，包含公司名称", async ({ page }) => {
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toContainText("北京一叶归真生物科技有限公司");
  });

  test("无 JS 控制台报错", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});

// ─── 茶站 ───────────────────────────────────────────────
test.describe("茶站 /tea/ 冒烟测试", () => {
  test("页面正常加载", async ({ page }) => {
    const response = await page.request.get("https://yiyeguizhen.com/tea/");
    expect(response.status()).toBe(200);
  });

  test("茶站页面有内容", async ({ page }) => {
    await page.goto("/tea/");
    await expect(page.locator("body")).not.toBeEmpty();
    // 确保不是空白页
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
