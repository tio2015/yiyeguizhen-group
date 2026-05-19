import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function today() {
  return nowIso().slice(0, 10);
}

export function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function normalizeKeyword(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function includesAny(text, words) {
  const haystack = String(text || "").toLowerCase();
  return words.some((word) => haystack.includes(String(word).toLowerCase()));
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
