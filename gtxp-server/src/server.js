import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { initDb, readState, replaceState, addCandidate, addEvidence, addSupplier } from "./db.js";
import { buildTasksFromSops, taskStats, updateTask } from "./tasks.js";
import { runNextTask, runPendingTasks, runTask } from "./runner.js";
import { schedulerStatus, startScheduler, tick } from "./scheduler.js";

initDb();
if (config.autoRun) startScheduler();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-gtxp-key",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function requireWrite(req, res) {
  if (!config.apiKey) return true;
  if (req.headers["x-gtxp-key"] === config.apiKey) return true;
  sendJson(res, 401, { ok: false, error: "Unauthorized" });
  return false;
}

function stateForFrontend() {
  const state = readState();
  return {
    meta: state.meta,
    products: state.candidates,
    candidates: state.candidates,
    evidence: state.evidence,
    suppliers: state.suppliers,
    sops: state.sops,
    tasks: state.tasks,
    runs: state.runs.slice(-50),
    taskStats: taskStats(),
    scheduler: schedulerStatus()
  };
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname.replace(/^\/gtxp-api/, "");

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (req.method === "GET" && (path === "/" || path === "/api/health")) {
      sendJson(res, 200, {
        ok: true,
        service: "yygz-gtxp-server",
        time: new Date().toISOString(),
        scheduler: schedulerStatus()
      });
      return;
    }

    if (req.method === "GET" && path === "/api/state") {
      sendJson(res, 200, { ok: true, state: stateForFrontend() });
      return;
    }

    if (req.method === "GET" && path === "/api/export") {
      sendJson(res, 200, readState());
      return;
    }

    if (req.method === "POST" && path === "/api/import") {
      if (!requireWrite(req, res)) return;
      const body = await readBody(req);
      const state = replaceState(body.state || body);
      sendJson(res, 200, { ok: true, state });
      return;
    }

    if (req.method === "POST" && path === "/api/candidates") {
      if (!requireWrite(req, res)) return;
      const item = addCandidate(await readBody(req));
      sendJson(res, 200, { ok: true, item, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/evidence") {
      if (!requireWrite(req, res)) return;
      const item = addEvidence(await readBody(req));
      sendJson(res, 200, { ok: true, item, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/suppliers") {
      if (!requireWrite(req, res)) return;
      const item = addSupplier(await readBody(req));
      sendJson(res, 200, { ok: true, item, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/tasks/generate") {
      if (!requireWrite(req, res)) return;
      const created = buildTasksFromSops({ force: url.searchParams.get("force") === "true" });
      sendJson(res, 200, { ok: true, created, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/tasks/run-next") {
      if (!requireWrite(req, res)) return;
      const result = await runNextTask();
      sendJson(res, 200, { ok: true, result, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/tasks/run-pending") {
      if (!requireWrite(req, res)) return;
      const body = await readBody(req);
      const results = await runPendingTasks(Number(body.limit || config.maxTasksPerTick));
      sendJson(res, 200, { ok: true, results, state: stateForFrontend() });
      return;
    }

    const runTaskMatch = path.match(/^\/api\/tasks\/([^/]+)\/run$/);
    if (req.method === "POST" && runTaskMatch) {
      if (!requireWrite(req, res)) return;
      const state = readState();
      const task = state.tasks.find((item) => item.id === runTaskMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found" });
        return;
      }
      const result = await runTask(task);
      sendJson(res, 200, { ok: true, result, state: stateForFrontend() });
      return;
    }

    if (req.method === "POST" && path === "/api/scheduler/tick") {
      if (!requireWrite(req, res)) return;
      const result = await tick();
      sendJson(res, 200, { ok: true, result, state: stateForFrontend() });
      return;
    }

    if (req.method === "PUT" && path.startsWith("/api/tasks/")) {
      if (!requireWrite(req, res)) return;
      const taskId = path.split("/")[3];
      const item = updateTask(taskId, await readBody(req));
      sendJson(res, item ? 200 : 404, item ? { ok: true, item } : { ok: false, error: "Task not found" });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found", path });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

const server = http.createServer(handle);
server.listen(config.port, () => {
  console.log(`GTXP radar server listening on http://127.0.0.1:${config.port}`);
});
