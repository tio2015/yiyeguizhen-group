import { config } from "./config.js";
import { buildTasksFromSops } from "./tasks.js";
import { runPendingTasks } from "./runner.js";

let timer = null;
let busy = false;

export async function tick() {
  if (busy) return { ok: false, skipped: true, reason: "busy" };
  busy = true;
  try {
    const created = buildTasksFromSops();
    const results = await runPendingTasks(config.maxTasksPerTick);
    return { ok: true, created: created.length, ran: results.length, results };
  } finally {
    busy = false;
  }
}

export function startScheduler() {
  if (timer) return;
  const interval = Math.max(1, config.runIntervalMinutes) * 60 * 1000;
  timer = setInterval(() => {
    tick().catch((error) => {
      console.error("[gtxp-scheduler]", error);
    });
  }, interval);
  tick().catch((error) => console.error("[gtxp-scheduler:init]", error));
}

export function stopScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function schedulerStatus() {
  return {
    enabled: Boolean(timer),
    busy,
    intervalMinutes: config.runIntervalMinutes,
    maxTasksPerTick: config.maxTasksPerTick
  };
}
