import { addCandidate, addEvidence, addSupplier, readState, writeState } from "./db.js";
import { buildFollowUpTasksForCandidate } from "./tasks.js";
import { config } from "./config.js";
import { clamp, includesAny, safeJsonParse, today } from "./utils.js";

const sceneWords = [
  "出差",
  "高铁",
  "飞机",
  "通勤",
  "办公室",
  "开会",
  "见客户",
  "饭后",
  "咖啡",
  "旅行",
  "小包",
  "长途"
];

const trendWords = ["刚发现", "最近", "新入", "冷门", "小众", "救命", "后悔", "无限回购", "没人推", "必备"];
const railHitWords = ["高铁西梅", "高铁奶酪", "高铁可比克", "高铁鳕鱼", "高铁上卖", "小推车卖"];

function inferProductName(task, result) {
  const query = task.query || result.query || "";
  const lines = result.cards || [];
  const firstUseful = lines.find((line) => !line.includes("登录") && !line.includes("验证码"));
  if (task.platform === "rail-check") return query.replace(/^(高铁小推车|高铁上卖的|高铁|火车上|动车)\s*/, "").trim();
  if (task.platform === "1688") return query.replace(/\s*(OEM|贴牌|现货|代工|私标)\s*/g, "").trim();
  if (firstUseful) {
    const cleaned = firstUseful.replace(/[🔥❗️!！｜|].*$/, "").trim();
    return cleaned.slice(0, 24) || query;
  }
  return query;
}

export function heuristicAnalyze(task, crawlResult) {
  const joined = `${task.query}\n${crawlResult.title}\n${(crawlResult.cards || []).join("\n")}\n${crawlResult.text || ""}`;
  const productName = inferProductName(task, crawlResult);
  const hasScene = includesAny(joined, sceneWords);
  const rising = includesAny(joined, trendWords);
  const railHit = task.platform === "rail-check" && includesAny(joined, railHitWords);
  const noRail = task.platform === "rail-check" && !railHit;
  let category = "第二类";
  if (railHit) category = "第一类";
  if ((rising || hasScene) && !railHit) category = "第三类";
  const xhs = task.platform === "xhs" ? clamp(10 + (crawlResult.cards || []).length / 4, 8, 20) : 8;
  const trend = rising ? 17 : hasScene ? 13 : 8;
  const rail = railHit ? 3 : noRail ? 14 : 10;
  const scene = hasScene ? 17 : 10;
  const supply = task.platform === "1688" ? 14 : 8;
  const risk = includesAny(joined, ["医疗", "治疗", "药", "危害", "骗局", "避雷"]) ? 4 : 7;
  const action = category === "第一类" ? "只学习" : total({ xhs, trend, rail, scene, supply, risk }) >= 74 ? "追" : "观察";

  return {
    candidates: [
      {
        name: productName,
        category,
        status: category === "第一类" ? "放弃" : "新发现",
        action,
        reason: hasScene
          ? "搜索结果命中高铁/出差/办公室/饭后等即时场景，适合继续验证。"
          : "由开放式搜索发现，需继续补充场景证据。",
        risk: risk <= 4 ? "搜索结果出现医疗、危害、骗局或避雷等风险词，需要人工复核。" : "暂无明确高风险词，仍需核查资质和舆论。",
        scores: { xhs, trend, rail, scene, supply, risk }
      }
    ],
    evidence: [
      {
        platform: task.platform,
        query: task.query,
        title: (crawlResult.cards || []).slice(0, 5).join("；") || crawlResult.title || "已采集页面结果",
        engagement: "",
        url: crawlResult.url,
        screenshot: crawlResult.screenshotFile || crawlResult.screenshot || "",
        rawText: (crawlResult.text || "").slice(0, 4000)
      }
    ],
    suppliers: []
  };
}

function total(scores) {
  return Object.values(scores).reduce((sum, value) => sum + Number(value || 0), 0);
}

function buildPrompt(task, crawlResult) {
  return `你是“一叶归真高铁潜爆品雷达”的分析器。

目标：从采集结果中发现适合高铁小推车销售、可贴牌、能带来扫码转化的潜爆品。

严格输出 JSON，不要输出解释文字。

分类：
第一类：小红书已火，高铁已出现。
第二类：小红书已火，高铁未查到。
第三类：小红书短期上升快，高铁未出现。

输入任务：
平台：${task.platform}
搜索词：${task.query}

采集摘要：
${JSON.stringify({
    title: crawlResult.title,
    url: crawlResult.url,
    cards: (crawlResult.cards || []).slice(0, 40),
    text: String(crawlResult.text || "").slice(0, 5000)
  })}

输出 JSON schema：
{
  "candidates": [
    {
      "name": "产品名或品类",
      "category": "第一类|第二类|第三类",
      "status": "新发现|观察|供应链验证|放弃",
      "action": "追|小测|观察|放弃|只学习",
      "reason": "高铁旅客为什么当场买",
      "risk": "主要风险",
      "scores": { "xhs": 0-20, "trend": 0-20, "rail": 0-15, "scene": 0-20, "supply": 0-15, "risk": 0-10 }
    }
  ],
  "evidence": [
    { "platform": "平台", "query": "搜索词", "title": "代表证据摘要", "engagement": "可见互动数", "url": "链接" }
  ],
  "suppliers": []
}`;
}

async function callAi(task, crawlResult) {
  const prompt = buildPrompt(task, crawlResult);
  if (config.aiProvider === "openai" && config.openAiApiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openAiApiKey}`
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });
    const json = await response.json();
    return safeJsonParse(json.choices?.[0]?.message?.content, null);
  }

  if (config.openRouterApiKey) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openRouterApiKey}`,
        "HTTP-Referer": config.publicBaseUrl,
        "X-Title": "YYGZ GTXP Radar"
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });
    const json = await response.json();
    return safeJsonParse(json.choices?.[0]?.message?.content, null);
  }

  return null;
}

function findExistingCandidate(state, name) {
  const normalized = String(name || "").replace(/\s+/g, "").toLowerCase();
  return state.candidates.find((candidate) => String(candidate.name || "").replace(/\s+/g, "").toLowerCase() === normalized);
}

function persistAnalysis(task, crawlResult, analysis) {
  const state = readState();
  const persisted = { candidates: [], evidence: [], suppliers: [] };

  for (const candidateInput of analysis.candidates || []) {
    if (!candidateInput.name) continue;
    const existing = findExistingCandidate(state, candidateInput.name);
    if (existing) {
      existing.category = candidateInput.category || existing.category;
      existing.status = candidateInput.status || existing.status;
      existing.action = candidateInput.action || existing.action;
      existing.reason = candidateInput.reason || existing.reason;
      existing.risk = candidateInput.risk || existing.risk;
      existing.scores = candidateInput.scores || existing.scores;
      existing.updatedAt = today();
      persisted.candidates.push(existing);
    } else {
      const created = addCandidate(candidateInput);
      persisted.candidates.push(created);
      if (created.category !== "第一类") buildFollowUpTasksForCandidate(created);
    }
  }

  const candidateId = persisted.candidates[0]?.id || task.candidateId || "";
  for (const evidenceInput of analysis.evidence || []) {
    const created = addEvidence({
      candidateId,
      platform: evidenceInput.platform || task.platform,
      query: evidenceInput.query || task.query,
      title: evidenceInput.title || crawlResult.title || "",
      engagement: evidenceInput.engagement || "",
      url: evidenceInput.url || crawlResult.url,
      screenshot: crawlResult.screenshotFile || crawlResult.screenshot || "",
      rawText: crawlResult.text || ""
    });
    persisted.evidence.push(created);
  }

  for (const supplierInput of analysis.suppliers || []) {
    if (!supplierInput.name) continue;
    const created = addSupplier({ ...supplierInput, candidateId });
    persisted.suppliers.push(created);
  }

  writeState(readState());
  return persisted;
}

export async function analyzeAndPersist(task, crawlResult) {
  let analysis = await callAi(task, crawlResult);
  if (!analysis || !Array.isArray(analysis.candidates)) {
    analysis = heuristicAnalyze(task, crawlResult);
  }
  return persistAnalysis(task, crawlResult, analysis);
}
