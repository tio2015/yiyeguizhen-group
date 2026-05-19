import { initDb } from "../src/db.js";

const state = initDb({ reset: true });
console.log(JSON.stringify({ ok: true, candidates: state.candidates.length, sops: state.sops.length }, null, 2));
