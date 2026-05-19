import { crawlTask, summarizeCrawlResult } from "./crawler.js";
import { analyzeAndPersist } from "./analyzer.js";
import { logRun } from "./db.js";
import { nextPendingTasks, updateTask } from "./tasks.js";

export async function runTask(task) {
  updateTask(task.id, {
    status: "running",
    attempts: Number(task.attempts || 0) + 1,
    lastError: ""
  });

  const crawlResult = await crawlTask(task);
  if (!crawlResult.ok) {
    const status = crawlResult.needsAuth ? "needs_auth" : "failed";
    updateTask(task.id, {
      status,
      lastError: (crawlResult.errors || []).join("; ")
    });
    logRun({
      taskId: task.id,
      ok: false,
      needsAuth: Boolean(crawlResult.needsAuth),
      platform: task.platform,
      query: task.query,
      error: (crawlResult.errors || []).join("; "),
      crawlResult
    });
    return { ok: false, task, crawlResult };
  }

  const persisted = await analyzeAndPersist(task, crawlResult);
  updateTask(task.id, {
    status: "done",
    lastError: "",
    resultSummary: summarizeCrawlResult(crawlResult).slice(0, 2000)
  });
  logRun({
    taskId: task.id,
    ok: true,
    platform: task.platform,
    query: task.query,
    persisted,
    crawlResult: {
      ...crawlResult,
      text: String(crawlResult.text || "").slice(0, 2000)
    }
  });
  return { ok: true, task, crawlResult, persisted };
}

export async function runNextTask() {
  const [task] = nextPendingTasks(1);
  if (!task) return { ok: true, skipped: true, message: "No pending task" };
  return runTask(task);
}

export async function runPendingTasks(limit = 1) {
  const tasks = nextPendingTasks(limit);
  const results = [];
  for (const task of tasks) {
    results.push(await runTask(task));
  }
  return results;
}
