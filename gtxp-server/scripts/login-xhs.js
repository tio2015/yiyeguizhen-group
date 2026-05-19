import { chromium } from "playwright";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../src/config.js";

const context = await chromium.launchPersistentContext(config.browserUserDataDir, {
  headless: false,
  viewport: { width: 1365, height: 950 }
});

const page = context.pages()[0] || (await context.newPage());
await page.goto("https://www.xiaohongshu.com/explore", { waitUntil: "domcontentloaded" });

console.log("\n请在打开的浏览器中扫码登录小红书。登录完成后回到这里按回车。");
const rl = readline.createInterface({ input, output });
await rl.question("登录完成后按回车继续...");
rl.close();

await context.storageState({ path: `${config.dataDir}/xhs-storage-state.json` }).catch(() => {});
await context.close();
console.log("小红书登录态已保存。");
