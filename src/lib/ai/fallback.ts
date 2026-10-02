// ─────────────────────────────────────────────────────────────────────────────
// التنظيم الآلي الحتمي للمادة المسترجعة (بدون نموذج ذكاء اصطناعي).
// هذا هو المسار الافتراضي المقصود عند غياب مفتاح AI — فهو لا يخترع شيئاً:
// يعيد ترتيب المادة المسترجعة نفسها ويعرض أبرز جُملها مع عناوين الموضوعات.
// ─────────────────────────────────────────────────────────────────────────────

import type { RetrievedPassage, TopicMatch } from "@/lib/types";

function firstSentences(text: string, max = 2): string {
  const parts = text
    .split(/[؛.]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, max).join("؛ ") + "؛";
}

export function buildResearchBrief(
  matchedTopics: TopicMatch[],
  passages: RetrievedPassage[],
): string {
  const lines: string[] = [];
  lines.push("تنظيم آلي حتمي للمادة المسترجعة (بدون نموذج ذكاء اصطناعي):");
  lines.push("");

  if (matchedTopics.length > 0) {
    lines.push("موضوعات المسار البحثي:");
    for (const m of matchedTopics) {
      const count = passages.filter((p) =>
        m.topic.keywords.some((k) => p.keywords.includes(k)) ,
      ).length;
      void count;
      lines.push(`• ${m.topic.title}`);
    }
    lines.push("");
  }

  lines.push("أبرز ما تضمنته المادة المسترجعة من المصدر المعتمد:");
  passages.forEach((p, i) => {
    lines.push(`${i + 1}. ${firstSentences(p.text)} (الموضع: ${p.chapter})`);
  });
  lines.push("");
  lines.push(
    "ملاحظة منهجية: التلخيص أعلاه جُمّع حرفياً من المقاطع المسترجعة نفسها، ولم يُضف إليه أي معنى من خارجها. وصفُ المستخدم يبقى وصفاً شخصياً، ومحتوى المصدر يبقى محتوى المصدر.",
  );
  return lines.join("\n");
}
