// مقاطع منتقاة حرفياً من «مجموع فتاوى ومقالات متنوعة» عبر صفحات ابن باز الرسمية.
// كل مقطع يحمل رابط صفحته الرسمية ورقم الجزء/الصفحة المثبت في حاشية الموقع.

import type { CorpusChunk } from "@/lib/types";

const SOURCE_ID = "binbaz-majmou-fatawa";

export const BINBAZ_MAJMOU_CHUNKS: CorpusChunk[] = [
  {
    id: "bbm-001",
    sourceId: SOURCE_ID,
    chapter: "دواء قسوة القلب",
    page: "مجموع الفتاوى 24/388",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/19845/%D8%AF%D9%88%D8%A7%D8%A1-%D9%82%D8%B3%D9%88%D8%A9-%D8%A7%D9%84%D9%82%D9%84%D8%A8",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["qaswat-al-qalb", "khushu-tadabbur", "dhikr-athar"],
    keywords: ["قسوة القلب", "تدبر القرآن", "ذكر الله", "إزالة القسوة"],
    text: "أحسن ما يوصى به لعلاج القلب وقسوته: العناية بالقرآن الكريم وتدبره، والإكثار من تلاوته، مع الإكثار من ذكر الله عز وجل.",
  },
  {
    id: "bbm-002",
    sourceId: SOURCE_ID,
    chapter: "من أكثر من ذكر الله اطمأن قلبه وارتاح ضميره",
    page: "مجموع الفتاوى 5/57",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/962/%D9%85%D9%86-%D8%A7%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D8%B0%D9%83%D8%B1-%D8%A7%D9%84%D9%84%D9%87-%D8%A7%D8%B7%D9%85%D8%A7%D9%86-%D9%82%D9%84%D8%A8%D9%87-%D9%88%D8%A7%D8%B1%D8%AA%D8%A7%D8%AD-%D8%B6%D9%85%D9%8A%D8%B1%D9%87",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["dhikr-athar", "al-hamm-wal-qalaq"],
    keywords: ["ذكر الله", "طمأنينة القلب", "راحة الضمير", "قراءة القرآن"],
    text: "أكثر من ذكر الله، وقراءة القرآن بالتدبر، واصحب الأخيار وابتعد عن الأشرار، وأبشر بالخير وحسن العاقبة، وستجد إن شاء الله بعد العمل بما ذكرته لك حلاوة الإيمان، ولذة الشهادتين وثمرة التوبة النصوح.",
  },
  {
    id: "bbm-003",
    sourceId: SOURCE_ID,
    chapter: "من أكثر من ذكر الله اطمأن قلبه وارتاح ضميره",
    page: "مجموع الفتاوى 5/57",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/962/%D9%85%D9%86-%D8%A7%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D8%B0%D9%83%D8%B1-%D8%A7%D9%84%D9%84%D9%87-%D8%A7%D8%B7%D9%85%D8%A7%D9%86-%D9%82%D9%84%D8%A8%D9%87-%D9%88%D8%A7%D8%B1%D8%AA%D8%A7%D8%AD-%D8%B6%D9%85%D9%8A%D8%B1%D9%87",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba", "dhikr-athar", "al-hamm-wal-qalaq"],
    keywords: ["صدق التوبة", "الفلاح", "الطمأنينة", "محو السيئات"],
    text: "فمن أكثر من ذكر الله وصدق في التوبة حصل له الفلاح والطمأنينة وراحة الضمير ومحيت عنه سيئاته. ثبتك الله على الهدى، ومنحك الاستقامة؛ إنه خير مسؤول.",
  },
  {
    id: "bbm-004",
    sourceId: SOURCE_ID,
    chapter: "التوبة من الذنوب وشروطها",
    page: "مجموع الفتاوى 9/364",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/3112/%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D9%85%D9%86-%D8%A7%D9%84%D8%B2%D9%86%D8%A7-%D9%88%D8%BA%D9%8A%D8%B1%D9%87-%D9%85%D9%86-%D8%A7%D9%84%D8%B0%D9%86%D9%88%D8%A8",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba"],
    keywords: ["باب التوبة", "التوبة النصوح", "الإقلاع", "الندم"],
    text: "التوبة بابها مفتوح إلى أن تطلع الشمس من مغربها، فمن تاب إلى الله توبة نصوحًا من الشرك فما دونه تاب الله عليه. والتوبة النصوح هي المشتملة على الإقلاع من الذنوب، والندم على ما فات منها، والعزم الصادق على ألا يعود فيها.",
  },
  {
    id: "bbm-005",
    sourceId: SOURCE_ID,
    chapter: "التحذير من الإقدام على المعصية بنية التوبة",
    page: "مجموع الفتاوى 9/364",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/3112/%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D9%85%D9%86-%D8%A7%D9%84%D8%B2%D9%86%D8%A7-%D9%88%D8%BA%D9%8A%D8%B1%D9%87-%D9%85%D9%86-%D8%A7%D9%84%D8%B0%D9%86%D9%88%D8%A8",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["takrar-al-dhanb", "al-tawba"],
    keywords: ["نية التوبة", "خداع الشيطان", "الإصرار", "المبادرة بالتوبة"],
    text: "ألا يتساهل مع الشيطان فيقدم على المعاصي بنية التوبة منها، ولا شك أن ذلك خداع من الشيطان وتزيين منه للوقوع في المعاصي بدعوى أنه سيتوب منها، وقد يعاقب العبد فيحال بينه وبين ذلك.",
  },
  {
    id: "bbm-006",
    sourceId: SOURCE_ID,
    chapter: "حكم ارتكاب المعصية بنية التوبة",
    page: "مجموع الفتاوى 5/410",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/1415/%D8%AD%D9%83%D9%85-%D9%85%D9%86-%D8%A7%D8%B1%D8%AA%D9%83%D8%A8-%D8%AC%D8%B1%D9%8A%D9%85%D8%A9-%D8%A8%D9%86%D9%8A%D8%A9-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["takrar-al-dhanb", "al-tawba"],
    keywords: ["شروط التوبة", "الإقلاع", "الندم", "العزم"],
    text: "التوبة النصوح هي المشتملة على: الإقلاع عن الذنوب، والندم على ما فات منها، والعزم الصادق على ألا يعود فيها خوفًا من الله سبحانه وتعظيمًا له ورجاء لعفوه ومغفرته.",
  },
  {
    id: "bbm-007",
    sourceId: SOURCE_ID,
    chapter: "هل التوبة تكفر الكبائر؟",
    page: "مجموع الفتاوى 22/416",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/19662/%D9%87%D9%84-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D8%AA%D9%83%D9%81%D8%B1-%D8%A7%D9%84%D9%83%D8%A8%D8%A7%D9%89%D8%B1",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba", "athar-al-dhunub"],
    keywords: ["التوبة النصوح", "تكفير الذنوب", "العمل الصالح", "عدم القنوط"],
    text: "التوبة النصوح يكفر الله بها جميع الذنوب حتى الشرك؛ لقول الله سبحانه: ﴿وتوبوا إلى الله جميعًا أيها المؤمنون لعلكم تفلحون﴾.",
  },
  {
    id: "bbm-008",
    sourceId: SOURCE_ID,
    chapter: "شروط التوبة النصوح",
    page: "مجموع الفتاوى 22/416",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/19662/%D9%87%D9%84-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D8%AA%D9%83%D9%81%D8%B1-%D8%A7%D9%84%D9%83%D8%A8%D8%A7%D9%89%D8%B1",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba"],
    keywords: ["شروط التوبة", "الندم", "الإقلاع", "العزم"],
    text: "شروط التوبة النصوح التي يكفر الله بها الخطايا ثلاثة: الأول: الندم على ما وقع منه من السيئات والمعاصي. والثاني: تركها والإقلاع منها؛ خوفًا من الله سبحانه وتعظيمًا له. والثالث: العزم الصادق ألا يعود فيها.",
  },
  {
    id: "bbm-009",
    sourceId: SOURCE_ID,
    chapter: "قبول التوبة وشروطها الأربعة",
    page: "مجموع الفتاوى 9/357",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/3104/%D9%82%D8%A8%D9%88%D9%84-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D9%88%D8%B4%D8%B1%D9%88%D8%B7%D9%87%D8%A7-%D8%A7%D9%84%D8%A7%D8%B1%D8%A8%D8%B9%D8%A9",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba"],
    keywords: ["قبول التوبة", "عدم القنوط", "رد الحقوق", "شروط التوبة"],
    text: "فنوصيك بلزوم التوبة وهي: الندم على ما مضى، وترك المعاصي، والعزم الصادق ألا تعودي فيها. وبذلك يغفر الله جميع ما مضى، وهناك شرط رابع إذا كانت المعصية تتعلق بحق الغير، فأعطيه حقه.",
  },
  {
    id: "bbm-010",
    sourceId: SOURCE_ID,
    chapter: "شروط التوبة وعدم الإصرار",
    page: "مجموع الفتاوى 28/448",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/20276/%C2%A0%D8%B4%D8%B1%D9%88%D8%B7-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba", "takrar-al-dhanb"],
    keywords: ["عدم الإصرار", "الندم", "ترك المعاصي", "التوبة"],
    text: "ولم يصروا يعني لم يقيموا على المعاصي، بل تابوا وندموا وتركوا، ولم يصروا على ما فعلوا، وهم يعلمون.",
  },
  {
    id: "bbm-011",
    sourceId: SOURCE_ID,
    chapter: "التوبة الصادقة فلاح وسعادة",
    page: "مجموع الفتاوى 28/424",
    sourceUrl:
      "https://binbaz.org.sa/fatwas/20258/%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D8%A7%D9%84%D8%B5%D8%A7%D8%AF%D9%82%D8%A9-%D9%81%D9%84%D8%A7%D8%AD-%D9%88%D8%B3%D8%B9%D8%A7%D8%AF%D8%A9",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["al-tawba", "takrar-al-dhanb"],
    keywords: ["التوبة الصادقة", "الثبات", "صحبة الأخيار", "الفلاح"],
    text: "نسأل الله أن يثبتنا وإياك على دينه ويرزقنا وإياك لزوم التوبة والاستقامة، ونوصيك بتقوى الله ولزوم التقوى وأبشر بالخير، من تاب أفلح.",
  },
];
