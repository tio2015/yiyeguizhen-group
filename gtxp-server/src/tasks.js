import { readState, writeState } from "./db.js";
import { id, nowIso, today, unique } from "./utils.js";

export function buildTasksFromSops({ force = false } = {}) {
  const state = readState();
  const created = [];
  for (const sop of state.sops.filter((item) => item.active !== false)) {
    for (const query of sop.queries || []) {
      const exists = state.tasks.some(
        (task) => task.query === query && task.platform === sop.platform && task.date === today()
      );
      if (exists && !force) continue;
      const task = {
        id: id("task"),
        sopId: sop.id,
        platform: sop.platform,
        topic: sop.name,
        query,
        status: "pending",
        priority: sop.platform === "xhs" ? 80 : 50,
        date: today(),
        attempts: 0,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.tasks.push(task);
      created.push(task);
    }
  }
  writeState(state);
  return created;
}

export function buildFollowUpTasksForCandidate(candidate) {
  const product = candidate.name;
  const railQueries = [
    `高铁 ${product}`,
    `高铁小推车 ${product}`,
    `高铁上卖的 ${product}`,
    `火车上 ${product}`,
    `动车 ${product}`
  ];
  const supplyQueries = [
    `${product} OEM`,
    `${product} 贴牌`,
    `${product} 现货`,
    `${product} 代工`,
    `${product} 私标`
  ];
  const state = readState();
  const tasks = [
    ...railQueries.map((query) => ({ platform: "rail-check", topic: "动态高铁排重", query })),
    ...supplyQueries.map((query) => ({ platform: "1688", topic: "动态供应链验证", query }))
  ].map((task) => ({
    id: id("task"),
    candidateId: candidate.id,
    status: "pending",
    priority: 70,
    date: today(),
    attempts: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...task
  }));

  const existingKey = new Set(state.tasks.map((task) => `${task.platform}:${task.query}:${task.candidateId || ""}`));
  const fresh = tasks.filter((task) => !existingKey.has(`${task.platform}:${task.query}:${task.candidateId || ""}`));
  state.tasks.push(...fresh);
  writeState(state);
  return fresh;
}

export function nextPendingTasks(limit = 1) {
  const state = readState();
  return state.tasks
    .filter((task) => ["pending", "failed"].includes(task.status))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(0, limit);
}

export function updateTask(taskId, patch) {
  const state = readState();
  const index = state.tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return null;
  state.tasks[index] = {
    ...state.tasks[index],
    ...patch,
    updatedAt: nowIso()
  };
  writeState(state);
  return state.tasks[index];
}

export function taskStats() {
  const state = readState();
  const statuses = unique(state.tasks.map((task) => task.status));
  return Object.fromEntries(statuses.map((status) => [status, state.tasks.filter((task) => task.status === status).length]));
}
