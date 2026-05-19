import { initDb } from "../src/db.js";
import { buildTasksFromSops } from "../src/tasks.js";
import { runNextTask } from "../src/runner.js";

initDb();
const created = buildTasksFromSops();
const result = await runNextTask();
console.log(JSON.stringify({ ok: true, created: created.length, result }, null, 2));
