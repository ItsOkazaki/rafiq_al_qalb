import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runResearch } from "@/lib/research/pipeline";
import { embedTexts } from "@/lib/ai/embeddings";
import {
  detectSourceConflicts,
  getAIConfig,
  planResearch,
  verifyClaims,
} from "@/lib/ai/provider";
import type { RetrievedPassage } from "@/lib/types";
import { ABSTAIN_MESSAGE, scanForForbiddenFraming } from "@/lib/terminology";

const SAMPLE_QUERY = "أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن";

function makeAIResponseForChat(system: string, user: string) {
  if (system.includes("مخطط استعلام")) {
    return {
      intent: "research",
      audience: "general",
      semanticQuery: SAMPLE_QUERY,
      subquestions: [SAMPLE_QUERY],
      searchTerms: ["قسوة القلب", "القرآن", "التأثر"],
    };
  }
  if (system.includes("مقيّم أدلة")) {
    const payload = JSON.parse(user) as { candidates: { id: string }[] };
    return {
      ranked: payload.candidates.map((candidate, i) => ({
        id: candidate.id,
        relevance: Math.max(0.60, 0.95 - i * 0.03),
        supports: [SAMPLE_QUERY],
        reason: "يدعم خطة البحث في المادة المرفقة.",
      })),
      gate: {
        sufficient: true,
        confidence: 0.94,
        coveredSubquestions: 1,
        totalSubquestions: 1,
        missingSubquestions: [],
        notes: "المادة تغطي سؤال البحث.",
      },
    };
  }
  if (system.includes("مولّد إجابة")) {
    const payload = JSON.parse(user) as { evidence: { id: string }[] };
    return {
      claims: payload.evidence.slice(0, 2).map((e, i) => ({
        id: `c${i + 1}`,
        text: `الادعاء الموثق رقم ${i + 1}.`,
        evidenceIds: [e.id],
      })),
      limits: ["المادة المسترجعة لا تتجاوز ما ظهر في المقاطع."]
    };
  }
  if (system.includes("مدقّق ادعاءات")) {
    const payload = JSON.parse(user) as { claims: { id: string }[] };
    return {
      claims: payload.claims.map((c) => ({
        id: c.id,
        status: "supported",
        note: "المقطع يسند الادعاء كما صيغ.",
      })),
      conflicts: [],
    };
  }
  if (system.includes("كاشف تباين")) {
    return {
      conflicts: [{
        sourceIds: ["synthetic-a", "synthetic-b"],
        passageIds: ["fixture-a", "fixture-b"],
        type: "explicit-contradiction",
        summary: "المصدران يقدمان حالتين متعارضتين في بيانات الاختبار.",
      }],
    };
  }
  throw new Error(`Unexpected AI system prompt: ${system.slice(0, 80)}`);
}

function installMockAI() {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (url.endsWith("/embeddings")) {
      const inputItems = Array.isArray(body.input) ? body.input : [];
      return new Response(JSON.stringify({
        data: inputItems.map((_: unknown, index: number) => ({
          index,
          embedding: [1, 0, 0, 0],
        })),
      }), { status: 200 });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = String(messages[0]?.content ?? "");
    const user = String(messages[1]?.content ?? "");
    const response = makeAIResponseForChat(system, user);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(response) } }],
    }), { status: 200 });
  }));
}

function syntheticPassage(id: string, sourceId: string, title: string, text: string): RetrievedPassage {
  return {
    chunkId: id,
    text,
    chapter: "fixture",
    page: "N/A",
    citationStatus: "chapter-only",
    excerptType: "curated-summary",
    keywords: [],
    score: 0.9,
    source: {
      sourceId,
      slug: sourceId,
      title,
      author: "Synthetic",
      publisher: "Benchmark",
      registryUrl: "https://example.invalid",
      originalUrl: "https://example.invalid",
    },
  };
}

describe("سياسات السلامة والفتوى قبل AI", () => {
  it("يوقف طلبات الخطر قبل أي استرجاع", async () => {
    const result = await runResearch("أفكر في الانتحار");
    expect(result.outcome).toBe("safety");
    expect(result.passages).toHaveLength(0);
  });

  it("يحيل مسائل الحكم الشرعي إلى أهل الاختصاص", async () => {
    const result = await runResearch("هل هذا الفعل حلال أم حرام؟");
    expect(result.outcome).toBe("fatwa");
    expect(result.passages).toHaveLength(0);
    expect(result.message).toMatch(/إفتاء|عالِم|أهل العلم/);
  });
});

describe("AI-first Evidence-Gated pipeline", () => {
  const previous: Record<string, string | undefined> = {};
  for (const key of ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_EMBEDDING_MODEL", "AI_API_KEY", "AI_BASE_URL", "AI_CHAT_MODEL", "AI_EMBEDDING_MODEL"]) {
    previous[key] = process.env[key];
  }

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_CHAT_MODEL;
    delete process.env.AI_EMBEDDING_MODEL;
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    process.env.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
    installMockAI();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("يجعل AI جزءاً من كامل مسار الإجابة ويجتاز التحقق", async () => {
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ok");
    expect(result.ai.mode).toBe("evidence-gated");
    expect(result.diagnostics.plan).not.toBeNull();
    expect(result.diagnostics.semanticRetrievalUsed).toBe(true);
    expect(result.diagnostics.reranked.length).toBeGreaterThan(0);
    expect(result.diagnostics.evidenceGate?.sufficient).toBe(true);
    expect(result.diagnostics.verifiedClaimCount).toBeGreaterThan(0);
    expect(result.ai.text).toContain("الادعاء الموثق");
    expect(result.diagnostics.pipeline).toEqual(expect.arrayContaining([
      "ai:research-planner",
      "ai:hybrid-retrieval",
      "ai:evidence-gate",
      "ai:claim-generation",
      "ai:claim-verification",
      "answer:verified",
    ]));
  });

  it("يحتفظ بمسار baseline للمقارنة فقط", async () => {
    const result = await runResearch(SAMPLE_QUERY, { mode: "baseline" });
    expect(result.outcome).toBe("ok");
    expect(result.ai.mode).toBe("baseline");
    expect(result.diagnostics.pipeline[0]).toBe("baseline:topic");
  });

  it("يفشل بشكل آمن إذا تعطل مزود AI ولا يعرض نصاً مولداً", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ai-unavailable");
    expect(result.ai.text).toBeNull();
    expect(result.diagnostics.pipeline).toContain("fallback:evidence-browser");
  });

  it("لا يسمح للمزوّد بأن يعيد embedding محلياً افتراضياً عند استخدام OpenAI", () => {
    const config = getAIConfig();
    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.embeddingModel).toBe("text-embedding-3-small");
  });
});


describe("مزودو AI المجانيون — Gemini / OpenRouter", () => {
  const previous: Record<string, string | undefined> = {};
  for (const key of [
    "AI_PROVIDER", "GEMINI_API_KEY", "GEMINI_CHAT_MODEL", "GEMINI_EMBEDDING_MODEL",
    "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_EMBEDDING_MODEL", "EMBEDDING_PROVIDER",
  ]) previous[key] = process.env[key];

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("يستخدم Gemini مباشرة مع generateContent وbatchEmbedContents", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_CHAT_MODEL = "gemini-3.1-flash-lite";
    process.env.GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.EMBEDDING_PROVIDER;

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url.includes(":generateContent")) {
        const system = String(body.systemInstruction?.parts?.[0]?.text ?? "");
        let payload: unknown;
        if (system.includes("مخطط استعلام")) payload = {
          intent: "research", audience: "general", semanticQuery: SAMPLE_QUERY,
          subquestions: [SAMPLE_QUERY], searchTerms: ["قسوة القلب", "القرآن", "التأثر"],
        };
        else payload = { ok: true };
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
        }), { status: 200 });
      }
      if (url.includes(":batchEmbedContents")) {
        const requests = Array.isArray(body.requests) ? body.requests : [];
        return new Response(JSON.stringify({
          embeddings: requests.map(() => ({ values: [1, 0, 0, 0] })),
        }), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    }));

    const config = getAIConfig();
    expect(config.provider).toBe("Gemini");
    expect(config.chatModel).toBe("gemini-3.1-flash-lite");
    expect(config.embeddingModel).toBe("gemini-embedding-2");
    expect(config.freeTierCapable).toBe(true);

    const plan = await planResearch(SAMPLE_QUERY);
    expect(plan.semanticQuery).toBe(SAMPLE_QUERY);
    const vectors = await embedTexts(["نص عربي للاختبار", "نص ثانٍ"]);
    expect(vectors).toHaveLength(2);
    expect(vectors?.[0]).toEqual([1, 0, 0, 0]);
  });

  it("يستخدم OpenRouter مع معرفات مجانية للمحادثة والتضمين", async () => {
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-router";
    process.env.OPENROUTER_MODEL = "qwen/qwen3.8-27b:free";
    process.env.OPENROUTER_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free";
    delete process.env.GEMINI_API_KEY;
    delete process.env.EMBEDDING_PROVIDER;

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url.endsWith("/chat/completions")) {
        const system = String(body.messages?.[0]?.content ?? "");
        const payload = system.includes("مخطط استعلام")
          ? { intent: "research", audience: "general", semanticQuery: SAMPLE_QUERY, subquestions: [SAMPLE_QUERY], searchTerms: ["قسوة القلب"] }
          : { ok: true };
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), { status: 200 });
      }
      if (url.endsWith("/embeddings")) {
        const inputs = Array.isArray(body.input) ? body.input : [];
        return new Response(JSON.stringify({ data: inputs.map((_: unknown, index: number) => ({ index, embedding: [0, 1, 0, 0] })) }), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    }));

    const config = getAIConfig();
    expect(config.provider).toBe("OpenRouter");
    expect(config.chatModel).toMatch(/:free$/);
    expect(config.embeddingModel).toMatch(/:free$/);
    expect(config.freeTierCapable).toBe(true);

    const plan = await planResearch(SAMPLE_QUERY);
    expect(plan.intent).toBe("research");
    const vectors = await embedTexts(["نص عربي"]);
    expect(vectors?.[0]).toEqual([0, 1, 0, 0]);
  });
});


describe("Claim verification and conflicts", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    process.env.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/chat/completions")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const system = String(body.messages?.[0]?.content ?? "");
        const user = String(body.messages?.[1]?.content ?? "");
        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify(makeAIResponseForChat(system, user)) } }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("يميز الادعاءات المتعارضة ولا يفصل أي مصدر هو الأصح", async () => {
    const passages = [
      syntheticPassage("fixture-a", "synthetic-a", "A", "The item is permitted."),
      syntheticPassage("fixture-b", "synthetic-b", "B", "The item is not permitted."),
    ];
    const result = await verifyClaims(
      "Compare the two sources.",
      [{ id: "c1", text: "The two sources agree.", evidenceIds: ["fixture-a", "fixture-b"] }],
      passages,
    );
    expect(result.claims[0].status).toBe("supported");
    // A direct conflict fixture is independently tested through the detector.
    const conflicts = await detectSourceConflicts("Compare the two sources.", passages);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].type).toBe("explicit-contradiction");
  });
});

describe("الامتناع الأمين", () => {
  it("يمنع الإجابة خارج المادة", async () => {
    const result = await runResearch("تاريخ الدولة الأموية وعمارة قرطبة في الأندلس");
    expect(result.outcome).toBe("abstained");
    expect(result.message).toBe(ABSTAIN_MESSAGE);
  });

  it("النصوص المولدة لا تحمل framing محظور", async () => {
    const result = await runResearch("أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن");
    const blob = JSON.stringify(result.ai.text ?? "");
    expect(scanForForbiddenFraming(blob)).toHaveLength(0);
  });
});
