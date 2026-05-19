import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  rootDir,
  port: Number(process.env.PORT || 8787),
  dataDir: path.resolve(rootDir, process.env.DATA_DIR || "./data"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "https://www.yiyeguizhen.com/gtxp",
  autoRun: process.env.AUTO_RUN === "true",
  runIntervalMinutes: Number(process.env.RUN_INTERVAL_MINUTES || 60),
  maxTasksPerTick: Number(process.env.MAX_TASKS_PER_TICK || 2),
  crawlerTimeoutMs: Number(process.env.CRAWLER_TIMEOUT_MS || 45000),
  crawlerSlowMoMs: Number(process.env.CRAWLER_SLOW_MO_MS || 0),
  browserUserDataDir: path.resolve(rootDir, process.env.BROWSER_USER_DATA_DIR || "./data/browser-profile"),
  headless: process.env.HEADLESS !== "false",
  aiProvider: process.env.AI_PROVIDER || "openrouter",
  aiModel: process.env.AI_MODEL || "openai/gpt-5-mini",
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  apiKey: process.env.GTXP_API_KEY || ""
};
