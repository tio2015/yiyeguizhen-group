import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { seedState } from "./seed-data.js";
import { id, nowIso, today } from "./utils.js";

const dbPath = path.join(config.dataDir, "radar-db.json");

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(path.join(config.dataDir, "screenshots"), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrate(state) {
  const next = {
    meta: { schemaVersion: 1, createdAt: today(), updatedAt: today(), ...(state.meta || {}) },
    candidates: state.candidates || state.products || [],
    evidence: state.evidence || [],
    suppliers: state.suppliers || [],
    sops: state.sops || seedState.sops,
    tasks: state.tasks || [],
    runs: state.runs || []
  };
  next.meta.updatedAt = today();
  return next;
}

export function initDb({ reset = false } = {}) {
  ensureDataDir();
  if (reset || !fs.existsSync(dbPath)) {
    writeState(clone(seedState));
  }
  return readState();
}

export function readState() {
  ensureDataDir();
  if (!fs.existsSync(dbPath)) return initDb();
  const raw = fs.readFileSync(dbPath, "utf8");
  return migrate(JSON.parse(raw));
}

export function writeState(state) {
  ensureDataDir();
  const next = migrate(state);
  next.meta.updatedAt = today();
  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(next, null, 2));
  fs.renameSync(tempPath, dbPath);
  return next;
}

export function withState(mutator) {
  const state = readState();
  const result = mutator(state);
  const next = writeState(state);
  return { state: next, result };
}

export function addCandidate(input) {
  return withState((state) => {
    const candidate = {
      id: input.id || id("p"),
      name: input.name,
      category: input.category || "第二类",
      status: input.status || "新发现",
      action: input.action || "观察",
      reason: input.reason || "",
      risk: input.risk || "",
      scores: input.scores || { xhs: 8, trend: 8, rail: 10, scene: 10, supply: 8, risk: 6 },
      createdAt: input.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.candidates.push(candidate);
    return candidate;
  }).result;
}

export function addEvidence(input) {
  return withState((state) => {
    const evidence = {
      id: input.id || id("e"),
      candidateId: input.candidateId || input.productId || "",
      date: input.date || today(),
      platform: input.platform || "unknown",
      query: input.query || "",
      title: input.title || "",
      engagement: input.engagement || "",
      url: input.url || "",
      screenshot: input.screenshot || "",
      rawText: input.rawText || "",
      sourcePath: input.sourcePath || "",
      createdAt: nowIso()
    };
    state.evidence.push(evidence);
    return evidence;
  }).result;
}

export function addSupplier(input) {
  return withState((state) => {
    const supplier = {
      id: input.id || id("s"),
      candidateId: input.candidateId || input.productId || "",
      name: input.name,
      spec: input.spec || "",
      moq: input.moq || "",
      price: input.price || "",
      sampleStatus: input.sampleStatus || "未联系",
      notes: input.notes || "",
      url: input.url || "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.suppliers.push(supplier);
    return supplier;
  }).result;
}

export function upsertTask(task) {
  return withState((state) => {
    const index = state.tasks.findIndex((item) => item.id === task.id);
    const next = { ...task, updatedAt: nowIso() };
    if (index >= 0) state.tasks[index] = { ...state.tasks[index], ...next };
    else state.tasks.push({ ...next, createdAt: task.createdAt || nowIso() });
    return next;
  }).result;
}

export function logRun(run) {
  return withState((state) => {
    const item = { id: run.id || id("run"), createdAt: nowIso(), ...run };
    state.runs.push(item);
    return item;
  }).result;
}

export function replaceState(nextState) {
  return writeState(nextState);
}

export function screenshotPath(fileName) {
  ensureDataDir();
  return path.join(config.dataDir, "screenshots", fileName);
}
