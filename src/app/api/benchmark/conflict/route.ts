import { detectSourceConflicts, getAIConfig, isAIConfigured, verifyClaims } from "@/lib/ai/provider";
import type { RetrievedPassage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAIConfigured()) {
    return Response.json({ ok: false, message: "Configure an AI provider first." }, { status: 503 });
  }

  const synthetic = (id: string, sourceId: string, title: string, text: string): RetrievedPassage => ({
    chunkId: id,
    text,
    chapter: "Synthetic conflict fixture",
    page: "N/A",
    citationStatus: "chapter-only",
    excerptType: "curated-summary",
    keywords: [],
    score: 0.9,
    source: {
      sourceId, slug: sourceId, title, author: "Synthetic evaluator", publisher: "Benchmark only",
      registryUrl: "https://example.invalid", originalUrl: "https://example.invalid",
    },
  });

  const passages = [
    synthetic("fixture-a", "synthetic-a", "Synthetic Source A", "The synthetic fixture states that the sample item is permitted for Scenario A."),
    synthetic("fixture-b", "synthetic-b", "Synthetic Source B", "The synthetic fixture states that the same sample item is not permitted for Scenario A."),
  ];

  const conflicts = await detectSourceConflicts("Compare the status of the sample item in the two synthetic sources.", passages);
  const verification = await verifyClaims(
    "Do the two synthetic sources give the same status for the sample item?",
    [{ id: "fixture-claim", text: "The two sources give the same status for the sample item.", evidenceIds: passages.map((p) => p.chunkId) }],
    passages,
  );

  return Response.json({
    ok: conflicts.length > 0 || verification.conflicts.length > 0 || verification.claims.some((c) => c.status === "conflicting"),
    provider: getAIConfig().provider,
    conflicts: [...conflicts, ...verification.conflicts].filter((c, i, all) => all.findIndex((other) => other.summary === c.summary) === i),
    claims: verification.claims,
    fixture: "synthetic-only",
  });
}
