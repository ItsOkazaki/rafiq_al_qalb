// اختبارات بطاقة المقطع: طبقات الحديث (مقتطف/متن كامل/شرح رسمي) والقرآن والمصدر.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { PassageCard } = await import("@/components/passage-card");
import type { RetrievedPassage } from "@/lib/types";

const SOURCE = {
  sourceId: "alifta-sunna-encyclopedia",
  slug: "alifta-sunna-encyclopedia",
  title: "جامع خادم الحرمين الشريفين للسنة النبوية المطهرة",
  author: "الرئاسة العامة للبحوث العلمية والإفتاء",
  publisher: "الرئاسة العامة للبحوث العلمية والإفتاء",
  registryUrl: "https://sunna.alifta.gov.sa/",
  originalUrl: "https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507",
};

function passage(overrides: Partial<RetrievedPassage>): RetrievedPassage {
  return {
    chunkId: "alifta-html-000001",
    text: "نص",
    chapter: "التوبة من الذنوب",
    citationStatus: "verified-page",
    excerptType: "literal",
    role: "evidence",
    keywords: ["التوبة"],
    score: 12,
    source: SOURCE,
    ...overrides,
  } satisfies RetrievedPassage;
}

describe("بطاقة المقطع — طبقات الحديث الرسمي", () => {
  it("تعرض المقتطف ثم المتن الكامل القابل للفتح ثم الشرح الرسمي برابطه", () => {
    const html = renderToStaticMarkup(
      <PassageCard
        passage={passage({
          hadithText: "كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا",
          hadithFullText:
            "حَدَّثَنَا مُحَمَّدُ بْنُ بَشَّارٍ ... قَالَ كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا ثُمَّ خَرَجَ يَسْأَلُ ... فَغُفِرَ لَهُ .",
          explanationText: "قَوْلُهُ : ( كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ ) لَمْ أَقِفْ عَلَى اسْمِهِ .",
          explanationSourceUrl: "https://sunna.alifta.gov.sa/MatnService/HadithServiceData?serviceId=6&mainId=5507&inx=0",
        })}
      />,
    );
    expect(html).toContain("الحديث");
    expect(html).toContain("عرض الحديث الكامل");
    expect(html).toContain("فَغُفِرَ لَهُ");
    expect(html).toContain("الشرح المرتبط بالمادة الأصلية");
    expect(html).toContain("MatnService/HadithServiceData?serviceId=6&amp;mainId=5507");
    expect(html).toContain("فتح صفحة الشرح");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("فتح المصدر الأصلي");
  });

  it("لا تخترع شرحاً: تعلن غياب الشرح الرسمي وتربط بصفحة المصدر", () => {
    const html = renderToStaticMarkup(
      <PassageCard
        passage={passage({
          hadithText: "لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ",
          hadithFullText: "حَدَّثَنَا أَبُو الْيَمَانِ ... لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ ... يَسْتَعْتِبَ .",
        })}
      />,
    );
    expect(html).toContain("لم يُسترجع شرح رسمي");
    expect(html).toContain("فتح صفحة المصدر");
    expect(html).not.toContain("الشرح المرتبط بالمادة الأصلية");
    expect(html).not.toContain("قَوْلُهُ");
  });

  it("لا تكرر الحديث: المتن الكامل لا يُعرض مرتين ولا يُعرض مع النص العام", () => {
    const full = "حَدَّثَنَا فُلَانٌ عَنْ فُلَانٍ أَنَّ النَّبِيَّ قَالَ مَنْ تَابَ قَبْلَ أَنْ تَطْلُعَ الشَّمْسُ مِنْ مَغْرِبِهَا تَابَ اللهُ عَلَيْهِ .";
    const html = renderToStaticMarkup(
      <PassageCard passage={passage({ hadithText: "مَنْ تَابَ قَبْلَ أَنْ تَطْلُعَ الشَّمْسُ", hadithFullText: full })} />,
    );
    expect(html.split("مَنْ تَابَ قَبْلَ أَنْ تَطْلُعَ الشَّمْسُ مِنْ مَغْرِبِهَا").length - 1).toBe(1);
  });

  it("متى تساوى المقتطف والمتن لا يظهر زر «عرض الحديث الكامل»", () => {
    const same = "لَا يَزْنِي الزَّانِي حِينَ يَزْنِي وَهُوَ مُؤْمِنٌ";
    const html = renderToStaticMarkup(<PassageCard passage={passage({ hadithText: same, hadithFullText: same })} />);
    expect(html).not.toContain("عرض الحديث الكامل");
  });

  it("لا تعرض عنوان الفصل على أنه متن حديث إن وصل دون تحقق", () => {
    const html = renderToStaticMarkup(
      <PassageCard
        passage={passage({
          chapter: "عمدة القاري — الرحمة وقساوة القلب",
          hadithText: "عمدة القاري — الرحمة وقساوة القلب",
          hadithFullText: "حدثنا عبدان ومحمد قالا أخبرنا عبد الله عن أسامة بن زيد قال هذه رحمة جعلها الله في قلوب عباده .",
          text: "حدثنا عبدان ومحمد قالا أخبرنا عبد الله عن أسامة بن زيد قال هذه رحمة جعلها الله في قلوب عباده .",
        })}
      />,
    );
    expect(html).toContain("حدثنا عبدان");
    expect(html).not.toMatch(/<p[^>]*>عمدة القاري — الرحمة وقساوة القلب<\/p>/);
  });
});

describe("بطاقة المقطع — القرآن والمقاطع العادية لم تتأثر", () => {
  it("النص القرآني يبقى في طبقته الخاصة برواية حفص", () => {
    const html = renderToStaticMarkup(
      <PassageCard
        passage={passage({
          quranText: "أَلَمْ يَأْنِ لِلَّذِينَ آمَنُوا أَن تَخْشَعَ قُلُوبُهُمْ لِذِكْرِ اللَّهِ",
          quranReference: "سورة الحديد — الآية 16",
          text: "تفسير الآية: حضّ على خشوع القلب لذكر الله.",
        })}
      />,
    );
    expect(html).toContain('data-quran-riwaya="hafs"');
    expect(html).toContain("quran-text");
    expect(html).toContain("رواية حفص عن عاصم");
    expect(html).toContain("سورة الحديد — الآية 16");
    expect(html).toContain("تفسير الآية");
  });

  it("مقطع دليل عادي بلا حقول حديثية يُعرض نصه كما هو", () => {
    const html = renderToStaticMarkup(
      <PassageCard passage={passage({ text: "والقلوب تمرض كما تمرض الأبدان، ودواؤها القرآن والذكر." })} />,
    );
    expect(html).toContain("والقلوب تمرض كما تمرض الأبدان");
    expect(html).not.toContain("عرض الحديث الكامل");
  });

  it("مدخل الفهرسة يبقى موسوماً بأنه ليس نص الحديث الكامل", () => {
    const html = renderToStaticMarkup(
      <PassageCard passage={passage({ role: "index", text: "مدخل موضوعي من نتائج الجامع الرسمي للتوبة من الذنوب." })} />,
    );
    expect(html).toContain("مدخل فهرسة موضوعية");
    expect(html).toContain("وليس نص الحديث الكامل");
  });
});
