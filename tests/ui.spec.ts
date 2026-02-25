/**
 * UI 用例 — 主站
 * 目标：覆盖交互行为、视觉状态、响应式、跳转逻辑
 */
import { test, expect } from "@playwright/test";

test.describe("主站 / 导航栏 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("初始状态：导航栏透明（未滚动）", async ({ page }) => {
    const nav = page.locator("nav#nav");
    const classList = await nav.getAttribute("class");
    expect(classList).not.toContain("scrolled");
  });

  test("滚动后：导航栏变为毛玻璃背景", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    const nav = page.locator("nav#nav");
    const classList = await nav.getAttribute("class");
    expect(classList).toContain("scrolled");
  });

  test("Logo 文字'一叶归真'可见", async ({ page }) => {
    await expect(page.locator(".nav-logo-text")).toContainText("一叶归真");
  });

  test("导航：中国茶招商链接指向 /tea/", async ({ page }) => {
    const teaLink = page.locator('a.nav-cta[href="/tea/"]');
    await expect(teaLink).toBeVisible();
    await expect(teaLink).toContainText("中国茶招商");
  });

  test("导航：大健康招商链接指向 /health/", async ({ page }) => {
    const healthLink = page.locator('a.nav-cta[href="/health/"]');
    await expect(healthLink).toBeVisible();
    await expect(healthLink).toContainText("大健康招商");
  });

  test("点击中国茶招商，跳转至茶站", async ({ page }) => {
    await page.click('a.nav-cta[href="/tea/"]');
    await expect(page).toHaveURL(/\/tea\//);
  });

  test("点击大健康招商，跳转至健康站", async ({ page }) => {
    await page.click('a.nav-cta[href="/health/"]');
    await expect(page).toHaveURL(/\/health\//);
  });
});

test.describe("主站 / Hero 区块 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("4 个数据指标全部可见", async ({ page }) => {
    const stats = page.locator(".hero-stat");
    await expect(stats).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(stats.nth(i)).toBeVisible();
    }
  });

  test("Hero 副标题包含招商关键词", async ({ page }) => {
    await expect(page.locator(".hero-desc")).toContainText("招商");
  });

  test("滚动提示动画元素存在", async ({ page }) => {
    await expect(page.locator(".scroll-hint")).toBeVisible();
  });
});

test.describe("主站 / 院士区块 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".academician-block").scrollIntoViewIfNeeded();
  });

  test("院士头像尺寸为 180px（桌面）", async ({ page }) => {
    const portrait = page.locator(".academician-portrait");
    const box = await portrait.boundingBox();
    expect(box?.width).toBeCloseTo(180, -1);
    expect(box?.height).toBeCloseTo(180, -1);
  });

  test("院士头衔包含'中国工程院院士'", async ({ page }) => {
    await expect(page.locator(".academician-title-text")).toContainText(
      "中国工程院院士"
    );
  });

  test("三个科研平台条目全部可见", async ({ page }) => {
    const awards = page.locator(".award-item");
    await expect(awards).toHaveCount(3);
  });
});

test.describe("主站 / 赛道选择区块 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".section-choose").scrollIntoViewIfNeeded();
  });

  test("中国茶卡片标题正确", async ({ page }) => {
    await expect(page.locator("#choose-tea .choose-name")).toContainText(
      "中国茶"
    );
  });

  test("大健康卡片标题正确", async ({ page }) => {
    await expect(page.locator("#choose-health .choose-name")).toContainText(
      "大健康"
    );
  });

  test("点击中国茶卡片跳转至 /tea/", async ({ page }) => {
    await page.click("#choose-tea");
    await expect(page).toHaveURL(/\/tea\//);
  });

  test("点击大健康卡片跳转至 /health/", async ({ page }) => {
    await page.click("#choose-health");
    await expect(page).toHaveURL(/\/health\//);
  });
});

test.describe("主站 / 移动端 UI", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("导航栏在手机端正常显示", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
  });

  test("Hero 标题在手机端可见", async ({ page }) => {
    await expect(page.locator(".hero-title")).toBeVisible();
  });

  test("院士头像手机端尺寸为 130px", async ({ page }) => {
    await page.locator(".academician-block").scrollIntoViewIfNeeded();
    const portrait = page.locator(".academician-portrait");
    const box = await portrait.boundingBox();
    expect(box?.width).toBeCloseTo(130, -1);
  });

  test("赛道卡片在手机端纵向排列", async ({ page }) => {
    await page.locator(".choose-grid").scrollIntoViewIfNeeded();
    const cards = page.locator(".choose-card");
    const box0 = await cards.nth(0).boundingBox();
    const box1 = await cards.nth(1).boundingBox();
    // 纵向排列：第二张卡片的 top 大于第一张的 bottom
    expect(box1!.y).toBeGreaterThan(box0!.y + box0!.height - 10);
  });

  test("Footer 在手机端可见", async ({ page }) => {
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toBeVisible();
  });
});
