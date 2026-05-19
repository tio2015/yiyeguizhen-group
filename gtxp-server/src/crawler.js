import path from "node:path";
import { chromium } from "playwright";
import { config } from "./config.js";
import { screenshotPath } from "./db.js";
import { id, normalizeKeyword, nowIso } from "./utils.js";

function searchUrl(task) {
  const query = encodeURIComponent(normalizeKeyword(task.query));
  if (task.platform === "1688") {
    return `https://s.1688.com/selloffer/offer_search.htm?keywords=${query}`;
  }
  if (task.platform === "web") {
    return `https://www.bing.com/search?q=${query}`;
  }
  return `https://www.xiaohongshu.com/search_result?keyword=${query}&source=web_explore_feed`;
}

async function extractXhs(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || "";
    const title = document.title || "";
    const links = [...document.querySelectorAll("a")]
      .slice(0, 80)
      .map((a) => ({ text: (a.innerText || a.textContent || "").trim(), href: a.href }))
      .filter((item) => item.text || item.href);
    const cards = [...document.querySelectorAll("section, article, a, div")]
      .map((el) => (el.innerText || "").trim())
      .filter((value) => value.length >= 8 && value.length <= 220)
      .slice(0, 80);
    return { title, text: text.slice(0, 9000), links, cards };
  });
}

async function extractGeneric(page) {
  return page.evaluate(() => {
    const title = document.title || "";
    const text = (document.body.innerText || "").slice(0, 9000);
    const cards = [...document.querySelectorAll("a, h1, h2, h3, p, li")]
      .map((el) => (el.innerText || el.textContent || "").trim())
      .filter((value) => value.length >= 4 && value.length <= 220)
      .slice(0, 100);
    const links = [...document.querySelectorAll("a")]
      .slice(0, 80)
      .map((a) => ({ text: (a.innerText || a.textContent || "").trim(), href: a.href }))
      .filter((item) => item.text || item.href);
    return { title, text, cards, links };
  });
}

export async function crawlTask(task) {
  const startedAt = nowIso();
  const url = searchUrl(task);
  const context = await chromium.launchPersistentContext(config.browserUserDataDir, {
    headless: config.headless,
    slowMo: config.crawlerSlowMoMs,
    viewport: { width: 1365, height: 950 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
  });
  const page = context.pages()[0] || (await context.newPage());

  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.crawlerTimeoutMs
    });
    await page.waitForTimeout(3500);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(1500);
    const fileName = `${task.platform}-${task.id}-${Date.now()}.png`.replace(/[^a-zA-Z0-9_.-]/g, "-");
    const shotPath = screenshotPath(fileName);
    await page.screenshot({ path: shotPath, fullPage: true });
    const extracted = task.platform === "1688" || task.platform === "web" ? await extractGeneric(page) : await extractXhs(page);
    const loginWall =
      /登录后查看搜索结果|手机号登录|获取验证码/.test(extracted.text || "") &&
      /小红书|用户协议|隐私政策/.test(extracted.text || "");
    if (loginWall) {
      return {
        ok: false,
        needsAuth: true,
        taskId: task.id,
        platform: task.platform,
        query: task.query,
        url,
        status: response ? response.status() : null,
        screenshot: shotPath,
        screenshotFile: path.basename(shotPath),
        startedAt,
        finishedAt: nowIso(),
        errors: ["Xiaohongshu login required"],
        ...extracted
      };
    }
    return {
      ok: true,
      taskId: task.id,
      platform: task.platform,
      query: task.query,
      url,
      status: response ? response.status() : null,
      screenshot: shotPath,
      screenshotFile: path.basename(shotPath),
      startedAt,
      finishedAt: nowIso(),
      errors,
      ...extracted
    };
  } catch (error) {
    return {
      ok: false,
      taskId: task.id,
      platform: task.platform,
      query: task.query,
      url,
      startedAt,
      finishedAt: nowIso(),
      errors: [...errors, error.message],
      title: "",
      text: "",
      cards: [],
      links: []
    };
  } finally {
    await context.close();
  }
}

export function summarizeCrawlResult(result) {
  const lines = [
    `平台：${result.platform}`,
    `搜索词：${result.query}`,
    `URL：${result.url}`,
    `标题：${result.title || ""}`,
    "",
    "可见条目：",
    ...(result.cards || []).slice(0, 30).map((card, index) => `${index + 1}. ${card}`),
    "",
    "页面文本摘录：",
    String(result.text || "").slice(0, 2500)
  ];
  return lines.join("\n").slice(0, 12000);
}
