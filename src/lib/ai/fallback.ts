// مقارن baseline فقط للقياس: تنظيم المادة المسترجعة حرفياً دون أي توليد.
// لا يُستخدم هذا المسار لإنتاج إجابة حوارية في الواجهة العامة.

import type { RetrievedPassage, TopicMatch } from "@/lib/types";

function firstSentences(text: string, max = 2): string {
  const parts = text
    .split(/[؛.]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, max).join("؛ ") + (parts.length > 0 ? "؛" : "");
}

export function buildResearchBrief(
  matchedTopics: TopicMatch[],
  passages: RetrievedPassage[],
): string {
  const lines: string[] = [];
  lines.push("وضع المقارنة التقليدي: عرض للمقاطع المسترجعة فقط دون نموذج توليد.");
  lines.push("");

  if (matchedTopics.length > 0) {
    lines.push("موضوعات المسار البحثي:");
    for (const m of matchedTopics) lines.push(`• ${m.topic.title}`);
    lines.push("");
  }

  lines.push("المقاطع التي وجدها البحث اللفظي:");
  passages.forEach((p, i) => {
    lines.push(`${i + 1}. ${firstSentences(p.text)} (الموضع: ${p.chapter})`);
  });
  lines.push("");
  lines.push("هذه النتيجة هي baseline للمقارنة فقط؛ لا تمثل مسار الإجابة المدعومة بالذكاء الاصطناعي.");
  return lines.join("\n");
}
