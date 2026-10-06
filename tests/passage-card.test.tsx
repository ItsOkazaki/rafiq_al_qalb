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
import { ALL_CHUNKS } from "@/lib/corpus/chunks";
import { toRetrievedPassage } from "@/lib/corpus/passages";
import { carriesCommentary } from "@/lib/corpus/hadith";

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

// الانحدار على المثال المُبلَّغ: بطاقة مقطع «عمدة القاري — الرحمة وقساوة القلب»
// (alifta-html-000162) كانت تعرض `hadithFullText` الملوَّث — المتن ثم شرح العيني
// كله — تحت عنوان «الحديث»، بينما الشرح الرسمي معروض أيضاً في طبقته الخاصة.
describe("بطاقة المقطع — السجل المبلَّع عنه (alifta-html-000162) كما يُعرض فعلاً", () => {
  const chunk = ALL_CHUNKS.find((c) => c.id === "alifta-html-000162");

  it("السجل موجود في المادة المسلَّمة", () => {
    expect(chunk).toBeDefined();
    expect(chunk!.chapter).toBe("عمدة القاري — الرحمة وقساوة القلب");
    expect(chunk!.sourceUrl).toBe(
      "https://sunna.alifta.gov.sa/BookToc/ViewServicePage?BookID=43&mainId=393972",
    );
  });

  it("ما يُعرض تحت «الحديث» هو المتن وحده لا شرح المعلِّق", () => {
    const rendered = toRetrievedPassage(chunk!, { score: 1 });
    expect(rendered).not.toBeNull();
    const html = renderToStaticMarkup(<PassageCard passage={rendered!} index={0} />);

    // عنوان طبقة الحديث حاضر، ومتنها هو متن أسامة بن زيد.
    expect(html).toContain("الحديث");
    expect(html).toContain("هذه رحمة جعلها الله في قلوب عباده");

    // أقسام شرح العيني لا تظهر في طبقة الحديث.
    const sharhSections = [
      "هذا الحديث مطابق لقوله",
      "( ذكر رجاله )",
      "( ذكر لطائف إسناده )",
      "( ذكر تعدد موضعه ومن أخرجه غيره )",
    ];
    const hadithLayer = html.slice(
      html.indexOf("الحديث"),
      html.indexOf("الشرح المرتبط بالمادة الأصلية"),
    );
    for (const section of sharhSections) {
      expect(hadithLayer, `شرح العيني ظهر تحت «الحديث»: ${section}`).not.toContain(section);
    }
  });

  it("لا تكرار للشرح بين طبقتي «الحديث» و«الشرح»", () => {
    const rendered = toRetrievedPassage(chunk!, { score: 1 })!;
    const html = renderToStaticMarkup(<PassageCard passage={rendered} index={0} />);
    const explanation = (rendered.explanationText ?? "").trim();
    expect(explanation.length).toBeGreaterThan(200);
    const hadithLayer = html.slice(
      html.indexOf("الحديث"),
      html.indexOf("الشرح المرتبط بالمادة الأصلية"),
    );
    // نافذة طويلة من الشرح لا تظهر في طبقة الحديث — أي لا يُطبع الشرح مرتين.
    expect(hadithLayer).not.toContain(explanation.slice(0, 300));
    expect(hadithLayer).not.toContain("قوله :");
  });

  it("وسم الموضع يُطبع مرة واحدة، والشرطة داخله من المصدر لا تكرار من الواجهة", () => {
    const rendered = toRetrievedPassage(chunk!, { score: 1 })!;
    expect(rendered.page).toBeUndefined();
    const html = renderToStaticMarkup(<PassageCard passage={rendered} index={0} />);
    const occurrences = html.split("عمدة القاري — الرحمة وقساوة القلب").length - 1;
    expect(occurrences).toBe(1);
    expect(html).not.toContain("عمدة القاري — الرحمة وقساوة القلب —");
  });
});

describe("بطاقة المقطع — متنٌ لم يُتحقق منه منفصلاً عن الشرح", () => {
  const CONTAMINATED =
    "حدثنا عبدان ومحمد قالا أخبرنا عبد الله عن أسامة بن زيد قال هذه رحمة جعلها الله في قلوب عباده .\n" +
    "قوله : \" قبض \" على صيغة المجهول أي قرب من أن يقبض ويدل على قرب الموت .";

  it("carriesCommentary تكشف الشرح الملحق بالمتن", () => {
    expect(carriesCommentary(CONTAMINATED)).toBe(true);
    expect(carriesCommentary("حدثنا فلان عن فلان أن النبي قال كذا وكذا .")).toBe(false);
    expect(carriesCommentary(undefined)).toBe(false);
  });

  it("تحجب طبقة الحديث بدل أن تُسمّي الشرح حديثاً، وتبقي الشرح الرسمي في طبقته", () => {
    const html = renderToStaticMarkup(
      <PassageCard
        passage={passage({
          hadithFullText: CONTAMINATED,
          explanationText: "شرح رسمي من الصفحة المرتبطة بالمادة الأصلية.",
          explanationSourceUrl: "https://sunna.alifta.gov.sa/BookToc/ViewServicePage?BookID=43&mainId=393972",
        })}
      />,
    );
    // لا عنوان «الحديث» ولا زر «عرض الحديث الكامل» فوق نصٍ مشروح.
    expect(html).not.toContain("عرض الحديث الكامل");
    expect(html).not.toContain("مقطع النتيجة من الجامع الرسمي");
    // الشرح الرسمي يبقى معروضاً في طبقته الخاصة برابطه.
    expect(html).toContain("الشرح المرتبط بالمادة الأصلية");
    expect(html).toContain("فتح صفحة الشرح");
  });

  it("لا تعرض المتن الملوَّث على أنه حديث حتى وإن جاء وحده بلا شرح منفصل", () => {
    const html = renderToStaticMarkup(
      <PassageCard passage={passage({ hadithFullText: CONTAMINATED })} />,
    );
    expect(html).not.toContain("مقطع النتيجة من الجامع الرسمي");
    // بلا متن موثق وبلا شرح رسمي: لا تُخترع طبقة حديثية ولا شرح.
    expect(html).not.toContain("الشرح المرتبط بالمادة الأصلية");
    expect(html).toContain("فتح المصدر الأصلي");
  });
});
