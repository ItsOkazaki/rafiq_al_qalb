// تحقق وقت التشغيل من شكل JSON المُعاد من /api/research:
// لا تُعرض استجابة لم يثبت شكلها، والخطأ يُعلن بدل التخمين.

import type { ResearchResult } from "@/lib/types";

const OUTCOMES = new Set(["ok", "abstained", "safety", "fatwa", "invalid"]);
const AI_MODES = new Set(["model", "deterministic"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseResearchResult(data: unknown): ResearchResult | null {
  if (!isRecord(data)) return null;

  if (typeof data.outcome !== "string" || !OUTCOMES.has(data.outcome)) return null;
  if (typeof data.query !== "string") return null;
  if (typeof data.disclaimer !== "string") return null;
  if (!isStringOrNull(data.message)) return null;

  if (!Array.isArray(data.topics)) return null;
  if (!isStringArray(data.keywords)) return null;
  if (!Array.isArray(data.passages)) return null;
  if (!Array.isArray(data.suggestions)) return null;

  if (!isRecord(data.ai)) return null;
  if (data.ai.mode !== null && (typeof data.ai.mode !== "string" || !AI_MODES.has(data.ai.mode))) return null;
  if (!isStringOrNull(data.ai.text)) return null;

  if (data.safety !== null && !isRecord(data.safety)) return null;
  if (data.fatwa !== null && !isRecord(data.fatwa)) return null;

  for (const topic of data.topics) {
    if (!isRecord(topic) || !isRecord(topic.topic)) return null;
    if (typeof topic.topic.id !== "string" || typeof topic.topic.title !== "string") return null;
  }

  for (const suggestion of data.suggestions) {
    if (!isRecord(suggestion)) return null;
    if (typeof suggestion.slug !== "string" || typeof suggestion.title !== "string") return null;
  }

  for (const passage of data.passages) {
    if (!isRecord(passage)) return null;
    if (typeof passage.chunkId !== "string") return null;
    if (typeof passage.text !== "string") return null;
    if (typeof passage.chapter !== "string") return null;
    if (!isRecord(passage.source)) return null;
    const source = passage.source;
    if (typeof source.sourceId !== "string") return null;
    if (typeof source.title !== "string") return null;
    if (typeof source.author !== "string") return null;
    if (typeof source.originalUrl !== "string") return null;
  }

  return data as unknown as ResearchResult;
}
