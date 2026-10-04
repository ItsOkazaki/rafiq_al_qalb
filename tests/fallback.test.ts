// اختبارات التنظيم الحتمي (fallback): علامات الترقيم العربية، تقسيم الجمل،
// وتوافق المخرج مع الحارس الصارم للغة العربية.

import { describe, expect, it } from "vitest";
import {
  buildResearchBrief,
  firstSentences,
  normalizeArabicPunctuation,
} from "@/lib/ai/fallback";
import { ALL_CHUNKS } from "@/lib/corpus/chunks";
import { getSourceById } from "@/lib/sources/registry";
import { scanForForbiddenFraming } from "@/lib/terminology";
import { isStrictArabicOutput } from "@/lib/text/strict-output";
import type { RetrievedPassage, TopicMatch } from "@/lib/types";
import { TOPICS } from "@/lib/rag/topics";

const SAMPLE_PASSAGE: RetrievedPassage = {
  chunkId: "dd-002",
  text: "وإن للمعاصي والذنوب من الآثار القبيحة المذمومة في الدنيا والآخرة ما لا يحصيه إلا الله؛ فمنها ما يقع على القلب من مرضه وضعفه وقسوته، ومنها ما يقع على البدن والرزق والحال. وكل ذلك من شؤم الذنب وعقوبته.",
  chapter: "فصل في ذم المعاصي وما يترتب عليها من الآثار القبيحة",
  citationStatus: "verified-page",
  excerptType: "curated-summary",
  role: "evidence",
  keywords: ["آثار المعاصي"],
  score: 10,
  source: {
    sourceId: "albadr-daa-dawaa",
    slug: "al-daa-wal-dawaa",
    title: "الداء والدواء (الجواب الكافي)",
    author: "ابن قيم الجوزية",
    publisher: "موقع البدر",
    registryUrl: "https://al-badr.net/",
    originalUrl: "https://al-badr.net/ebook/13",
  },
};

describe("التنظيم الآلي الحتمي ومعالجة الترقيم العربي", () => {
  it("يوحّد علامات الترقيم اللاتينية العارضة (, ; ?) إلى مقابلها العربي (، ؛ ؟)", () => {
    expect(normalizeArabicPunctuation("جملة أولى, جملة ثانية; هل هذا واضح?")).toBe(
      "جملة أولى، جملة ثانية؛ هل هذا واضح؟",
    );
  });

  it("يقسّم الجمل على الفاصلة المنقوطة والنقطة والاستفهام والتعجب والوقف العربي", () => {
    const text = "هل للقاتل توبة؟ قال: نعم! ومن يحول بينه وبين التوبة. انطلق إلى أرض كذا.";
    expect(firstSentences(text, 2)).toBe("هل للقاتل توبة؛ قال: نعم؛");
  });

  it("يعامل الفاصلة المنقوطة وعلامة الاستفهام اللاتينيتين كفواصل جمل عربية", () => {
    const text = "الجزء الأول; الجزء الثاني, مع فاصلة? الجزء الثالث.";
    expect(firstSentences(text, 2)).toBe("الجزء الأول؛ الجزء الثاني، مع فاصلة؛");
  });

  it("يتجنب الترقيم المزدوج عند انتهاء النص بـ «. ؟» أو علامات متتابعة", () => {
    const text = "وهل وجدت توبة أفضل من أن جادت بنفسها لله تعالى . ؟\n\nقوله: شرح الحديث.";
    const out = firstSentences(text, 2);
    expect(out).toBe("وهل وجدت توبة أفضل من أن جادت بنفسها لله تعالى؛ قوله: شرح الحديث؛");
    expect(out).not.toContain("؛ ؟");
    expect(out).not.toContain("؟؟");
  });

  it("يعيد سلسلة فارغة عند نص فارغ أو مقتصر على علامات ترقيم أو عند max <= 0", () => {
    expect(firstSentences("")).toBe("");
    expect(firstSentences("   ؛ . ؟ !  ")).toBe("");
    expect(firstSentences("جملة صالحة.", 0)).toBe("");
  });

  it("يبني ملخصاً حتمياً يتضمن الموضوعات والمقاطع والمواضع والملاحظة المنهجية", () => {
    const topicMatch: TopicMatch = {
      topic: TOPICS[0],
      score: 8,
    };
    const brief = buildResearchBrief([topicMatch], [SAMPLE_PASSAGE]);
    expect(brief).toContain("تنظيم آلي حتمي للمادة المسترجعة");
    expect(brief).toContain(`• ${TOPICS[0].title}`);
    expect(brief).toContain(`(الموضع: ${SAMPLE_PASSAGE.chapter})`);
    expect(brief).toContain("ملاحظة منهجية:");
  });

  it("يتخطى قسم موضوعات المسار البحثي حين تكون قائمة الموضوعات فارغة", () => {
    const brief = buildResearchBrief([], [SAMPLE_PASSAGE]);
    expect(brief).not.toContain("موضوعات المسار البحثي:");
    expect(brief).toContain("أبرز ما تضمنته المادة المسترجعة من المصدر المعتمد:");
  });

  it("يمر التنظيم الحتمي من حارس اللغة العربية الصارم ومن فاحص الصياغات المحظورة على كامل الـcorpus", () => {
    for (const chunk of ALL_CHUNKS) {
      const src = getSourceById(chunk.sourceId)!;
      const passage: RetrievedPassage = {
        chunkId: chunk.id,
        text: chunk.text,
        chapter: chunk.chapter,
        citationStatus: chunk.citationStatus ?? "verified-page",
        excerptType: chunk.excerptType,
        role: chunk.role ?? "evidence",
        keywords: chunk.keywords,
        score: 10,
        source: {
          sourceId: src.id,
          slug: src.slug,
          title: src.title,
          author: src.author,
          publisher: src.publisher,
          registryUrl: src.registryUrl,
          originalUrl: chunk.sourceUrl ?? src.originalUrl,
        },
      };
      const brief = buildResearchBrief([], [passage]);
      expect(isStrictArabicOutput(brief), `chunk ${chunk.id}`).toBe(true);
      expect(scanForForbiddenFraming(brief), `chunk ${chunk.id}`).toHaveLength(0);
    }
  });
});
