// استخراج/اقتراح الكلمات المفتاحية للمسار البحثي — حتمي وشفاف.

import { normalizeArabic } from "@/lib/text/arabic";
import type { RetrievedPassage, TopicMatch } from "@/lib/types";

export const MAX_KEYWORDS = 8;

/**
 * تجميع كلمات مفتاحية مقترحة من: موضوعات المسار المحددة + كلمات المقاطع
 * المسترجعة التي ظهرت في استعلام المستخدم + كلمات الموضوع ذات الصلة.
 */
export function extractKeywords(
  query: string,
  matchedTopics: TopicMatch[],
  passages: RetrievedPassage[],
): string[] {
  const norm = normalizeArabic(query);
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (kw: string) => {
    const key = normalizeArabic(kw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(kw);
  };

  // ١) كلمات الموضوعات المطابقة (الأعلى أولاً، كلمتان لكل موضوع).
  for (const m of matchedTopics.slice(0, 2)) {
    for (const kw of m.topic.keywords.slice(0, 2)) push(kw);
  }
  // ٢) كلمات المقاطع المسترجعة التي وردت في استعلام المستخدم.
  for (const p of passages) {
    for (const kw of p.keywords) {
      if (normalizeArabic(kw) && norm.includes(normalizeArabic(kw))) push(kw);
    }
  }
  // ٣) إكمال من كلمات الموضوع الأول إن لزم.
  if (matchedTopics[0]) {
    for (const kw of matchedTopics[0].topic.keywords) push(kw);
  }

  return out.slice(0, MAX_KEYWORDS);
}
