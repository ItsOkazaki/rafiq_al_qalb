// ─────────────────────────────────────────────────────────────────────────────
// السلامة أولاً: يحدث الفحص قبل أي استرجاع.
// عند الاشتباه بخطر إيذاء النفس: يتوقف كل شيء ويُعرض رد السلامة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeArabic } from "@/lib/text/arabic";
import type { SafetyInfo } from "@/lib/types";

const SELF_HARM_MARKERS: string[] = [
  "انتحار",
  // صيغ الفعل من الجذر نفسه: «انتحر»، «سانتحر»، «ينتحر»، «ننتحر»…
  // «نتحر» تغطيها جميعاً بالاحتواء بعد التطبيع، وتبقى بعيدةً عن المفردات
  // البحثية التي يعالجها «انتحار» وحده.
  "انتحر",
  "نتحر",
  "اقتل نفسي",
  "اودي بنفسي",
  "اودي نفسي",
  "انهي حياتي",
  "انهاء حياتي",
  "اريد ان اموت",
  "اريد الموت",
  "اريد اموت",
  "اتمني الموت",
  "اتمني الموت",
  "اتمنا الموت",
  "اتمني اموت",
  "اتمنا اموت",
  "نفسي اموت",
  "ودي اموت",
  "حاب نموت",
  "حاب اموت",
  "نحب نموت",
  "بغيت نموت",
  "بدي اموت",
  // الخليجية: «أبغى/أبغا/بغيت أموت» — كانت الصيغة الخليجية للرغبة في الموت
  // خارج المعجم تماماً، وهي الأكثر استعمالاً عند الجمهور المستهدف.
  "ابغي اموت",
  "ابغا اموت",
  "ابغي الموت",
  "ابغا الموت",
  "بغا اموت",
  "يبغي اموت",
  "نبغي نموت",
  "نبي نموت",
  "ودي اموت وارتاح",
  "ودي ارتاح من الدنيا",
  "ودي ارتاح من الحياه",
  "ايذاء نفسي",
  "ايذاء النفس",
  "ايذي نفسي",
  "اجرح نفسي",
  "اجرح نفسي",
  "لا اريد ان اعيش",
  "لا اريد العيش",
  "ما نيش حاب نعيش",
  "ماني حاب نعيش",
  "مانيش حاب نعيش",
  "لا رغبه لي في الحياه",
  "سيمت الحياه",
  "سيمت من الحياه",
  // عائلة الضجر/العجز من الحياة نفسها التي اعتمدها المعجم أصلاً («سيمت الحياة»):
  "تعبت من الحياه",
  "تعبت من الدنيا",
  "تعبت من هالدنيا",
  "تعبت من العيش",
  "زهقت من الحياه",
  "زهقت من الدنيا",
  "مللت من الحياه",
  "مللت من الدنيا",
  "ييست من الحياه",
  "ييست من الدنيا",
  "ما اقدر اكمل",
  "ما عاد اقدر اكمل",
  "ما عاد فيني اكمل",
  "ما فيني اكمل",
  "ما قادر اكمل",
  "مش قادر اكمل",
  "مو قادر اكمل",
  "ما اقدر استمر",
  "ما ابي اعيش",
  "ما ابغي اعيش",
  "ما ابغا اعيش",
  "ما نبي نعيش",
  "ما ودي اعيش",
  "ما ودي اكمل",
  "ما عاد ودي اعيش",
  "قتل النفس",
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "selfharm",
  "want to die",
  "hurt myself",
  "dont want to live",
  "don t want to live",
  "no reason to live",
  "nothing to live for",
  "better off dead",
  "better if i die",
  "better if i was dead",
  "end it all",
  "ending it all",
  "take my own life",
  "take my life",
  "not worth living",
  "want to disappear",
  "cant go on",
  "can t go on",
  "give up on life",
  "off myself",
  // طرق ووسائل (إنجليزي)
  "killing myself", "hanging myself", "hang myself", "cut my wrists", "cutting myself",
  "cut my wrist", "overdose", "over dose", "swallow pills", "jump off", "throw myself",
  "no point in living", "tired of living", "end everything", "stop existing",
  // صياغات عربية ضيّقة لا تُستنتج تركيبياً بأمان
  "الموت هو الحل", "الموت الحل الوحيد", "غير الموت قدامي", "الموت قدامي",
  "الموت امامي", "ما اشوف غير الموت", "ما اري غير الموت",
  "خلص علي نفسي", "ما احد بيحس لو اختفيت", "ماحد بيحس", "ما احد يحس لو",
  "ولا احد يحس لو", "ما احد بيفتقدني", "ماحد يفتقدني", "لو اختفيت ما احد",
  "ما اكون موجود", "لو ما كنت موجود", "احسن اني ما اكون", "ياليتني ما خلقت",
  "ليتني ما خلقت", "ياليتني مت", "ليتني مت", "لو اني مت", "ما باقي لي شي",
  "ما باقي لي شيء", "ما بقا لي شي", "حياتي ما لها لازمه", "حياتي ما لها قيمه",
  "حياتي ما لها معني", "وجودي ما له معني", "ما لي رغبه في الحياه",
  "بكتب وصيتي", "جهزت كل شي للانتحار",
];

/** أدوات النفي: تُبطل دلالة الخطر للعبارة التي تسبقها مباشرةً. */
const NEGATION_TOKENS = new Set([
  "لا", "ما", "مش", "مو",
  "ليس", "ليست", "لسنا", "ماني",
  "مانيش", "ماش", "ماشي",
]);

/** صيغ مرنة للتشكيل/العلامات والمسافات: «أريد أن أموت»، «اريد اموت»، إلخ. */
const SAFETY_PATTERNS: RegExp[] = [
  /(?:^|\s)اريد(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)اتمني(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)اتمنا(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)نفسي\s+اموت(?:\s|$)/,
  /(?:^|\s)(?:ودي|حاب|بدي|بغيت|نحب|حاب)\s+(?:ان\s+)?اموت(?:\s|$)/,
  /(?:^|\s)اريد\s+الموت(?:\s|$)/,
  /(?:^|\s)اتمني\s+الموت(?:\s|$)/,
  /(?:^|\s)اتمنا\s+الموت(?:\s|$)/,
  // «أبغى/أبغا أموت» وصيغ الرغبة الخليجية مع فاصل اختياري.
  /(?:^|\s)(?:ابغي|ابغا|بغا|يبغي|نبغي|نبي)\s+(?:ان\s+|اني\s+)?(?:اموت|الموت|نموت|اتوفي)(?:\s|$)/,
  // الموت بوصفه راحةً أو أفضلية — «الموت أريح لي»، «أحسن إني أموت».
  /(?:^|\s)(?:الموت|موت)\s+(?:اريح|ارياح|احسن|افضل|راحه|نعمه)(?:\s|$)/,
  /(?:^|\s)(?:اريح|احسن|افضل|اولي)\s+(?:لي|لنا|اني)?\s*(?:اموت|الموت|موتي)(?:\s|$)/,
  // «أرتاح من الدنيا/الحياة» — طلب الخلاص لا طلب السكينة.
  /(?:^|\s)(?:ارتاح|ارتاحن|استريح|برتاح|نرتاح|اريح)\s+(?:من\s+)?(?:الدنيا|هالدنيا|الحياه|حياتي|العيشه|هالعيشه|العالم)(?:\s|$)/,
  /(?:^|\s)(?:ودي|ابغي|ابغا|اريد|نبي|بدي|حاب)\s+(?:ان\s+|اني\s+)?(?:اختفي|ارحل|امشي|اترك)\s+(?:من\s+)?(?:الدنيا|هالدنيا|الحياه|العالم)(?:\s|$)/,
  // «ما أصحى من نومي» — أمنيات النوم الذي لا قيام بعده.
  /(?:^|\s)(?:ما|لا|مو|مش)\s+(?:اصحي|اصح|استيقظ|افوق|اقوم)\s+(?:من\s+)?(?:نومي|النوم)(?:\s|$)/,
  /(?:^|\s)نومه\s+ما\s+بعدها\s+قيام(?:\s|$)/,
  // وداعٌ ورسائل ختامية.
  /(?:^|\s)وداعا\s+(?:يا\s+)?(?:اهلي|الجميع|كل|اصحابي|احبايي|حبايبي|الناس|اصدقايي)(?:\s|$)/,
  /(?:^|\s)(?:هذي|هذه|دي|هاي)\s+(?:اخر|اخر)\s+(?:رساله|رسال|مره|مره|كلام|كلمه|لقاء)(?:\s|$)/,
  /(?:^|\s)(?:خلاص|راح)\s+(?:برتاح|ارتاح|اموت|خلصت|تخلصت)(?:\s|$)/,
  /(?:^|\s)ما\s+(?:راح|بت|ح)\s+(?:تشوفوني|تسمعون|تسمعين|تشوفون)(?:\s|$)/,
];

/**
 * هل هذا الوقوع للعلامة مسبوق بأداة نفي مباشرة؟
 * النفي يُبطل دلالة الخطر لهذا الوقوع وحده — فإن وُجد في الجملة نفسها
 * وقوع آخر مؤكّد («لا أريد الموت لكنني سأنتحر») بقيت السلامة مفعّلة.
 */
function occurrenceIsNegated(norm: string, index: number): boolean {
  const before = norm.slice(0, index).trimEnd();
  if (!before) return false;
  const words = before.split(/\s+/);
  const last = words[words.length - 1];
  return typeof last === "string" && NEGATION_TOKENS.has(last);
}

/**
 * هل وقع بعد العلامة هدفٌ آخر (غير النفس)؟ تمنّي الموت **للغير** ليس إيذاءً للنفس:
 * «أتمنى الموت لأعداء الإسلام»، «ما حكم الدعاء على الظالم بالموت».
 */
function followedByOtherTarget(norm: string, endIndex: number): boolean {
  const after = norm.slice(endIndex).trim();
  if (!after) return false;
  const words = after.split(/\s+/).slice(0, 2);
  return words.some((w) => inGroup(w, OTHER_TARGET_TOKENS));
}

function markerTargetsOther(norm: string, marker: string, index: number): boolean {
  return followedByOtherTarget(norm, index + marker.length);
}

function hasAffirmativeMarker(norm: string, marker: string): boolean {
  if (!marker) return false;
  let idx = norm.indexOf(marker);
  while (idx !== -1) {
    if (!occurrenceIsNegated(norm, idx) && !markerTargetsOther(norm, marker, idx)) return true;
    idx = norm.indexOf(marker, idx + Math.max(marker.length, 1));
  }
  return false;
}

function hasAffirmativePattern(norm: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(norm)) !== null) {
    const negated = occurrenceIsNegated(norm, match.index);
    const forSomeoneElse = followedByOtherTarget(norm, match.index + match[0].length);
    if (!negated && !forSomeoneElse) return true;
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// الطبقة التركيبية (compositional) — بعد المعجم والأنماط.
//
// لماذا: المعجم قائمة مغلقة، وأي صياغة لم تُكتب فيه تمرّ بصمت. وهذا تحديداً ما
// حدث لصيغ خليجية شائعة («أبغى أموت وأرتاح من هالدنيا») وللتعبير غير المباشر
// («كل يوم أدعي إني ما أصحى من نومي»). الطبقة التركيبية لا تبحث عن عبارات
// محفوظة، بل عن **نية شخصية في ترك الحياة** مركَّبة من عناصر:
//   (أداة رغبة أو نفي أو تعب) + (موت / حياة / راحة من الدنيا / اختفاء)
// مع استثناء الإطار البحثي: «أريد أن أذكر الموت» بحثٌ لا أزمة.
//
// القاعدة الحاكمة: الخطأ نحو «تفعيل السلامة» أولى من الخطأ نحو تجاهلها، لكن
// ذكر الموت بوصفه موضوعاً بحثياً يبقى غير مفعِّل (كما في اختبارات المعجم).
// ─────────────────────────────────────────────────────────────────────────────

/** أدوات الرغبة بصيغها الفصيحة والعامية (بعد التطبيع: أبغى→ابغي، أتمنى→اتمني). */
const DESIRE_TOKENS = new Set([
  "اريد", "ارغب", "رغب", "ابغي",
  "ابغا", "بغي", "بغيت", "يبغي",
  "يبغا", "يبي", "يبا", "نبي",
  "نبغي", "نبغا", "ودي", "وديت",
  "بدي", "حاب", "حابه", "نحب",
  "بحب", "اتمني", "اتمنا", "تمنيت",
  "مشتهي", "نفسي", "نفس", "محتاج",
  "عايز", "عايزه", "عاوز", "عاوزه",
  "ليت", "حابب",
]);

/**
 * ألفاظ الموت والفناء الشخصي — مضبوطة عمداً على ألفاظ الموت وحدها.
 * لا تدخلها «حياتي» ولا «فنائي» ولا «انتهاء»: «أريد أن أغيّر حياتي» و«فناء النفس»
 * في كلام القوم عبارات بحثية مشروعة، وإدخالها يصنع تفعيلاً خاطئاً للسلامة.
 */
const DEATH_TOKENS = new Set([
  "اموت", "موت", "موتي", "نموت",
  "يموت", "تموت", "اتموت", "اتوفي",
  "توفي", "توفاني", "وفاتي", "الوفاه",
  "انتحر", "انتحار", "انتحاري", "يموتا",
]);

/** ألفاظ البقاء/الاستمرار التي يُطلب نفيها في حالة الأزمة. */
const LIVE_TOKENS = new Set([
  "اعيش", "عيش", "العيش", "نعيش",
  "تعيش", "حياه", "الحياه", "نحيي",
  "احيي", "يحيي", "نحيا", "اكمل",
  "استمر", "استمرار", "اقدر", "اكدر",
  "قادر", "قادره", "فيني", "طاقه",
  "باقي", "بقي", "بقايي",
]);

/**
 * أفعال الحياة **الشخصية** فقط (لا الاسم العام «الحياة»): تُستعمل في قاعدة
 * «لا سبب لأعيش». الاسم العام يُبقي «ما معنى الحياة في الإسلام» سؤالاً بحثياً.
 */
const PERSONAL_LIVE_TOKENS = new Set([
  "اعيش", "عيش", "نعيش", "تعيش",
  "اكمل", "استمر", "اقدر", "اكدر",
  "بقايي", "نحيي", "احيي",
]);

/** أفعال الخلاص والراحة — أفعال فقط: الاسم «راحة» يدخل في كلام الطمأنينة المشروعة. */
const REST_VERBS = new Set([
  "ارتاح", "استريح", "اريح", "برتاح",
  "نرتاح", "ارتاحي", "ارتاحو", "اتخلص",
  "اتحرر", "اهرب", "ارتاحوا", "استريحي",
]);

/** ما يُطلب الخلاص منه في صياغة الأزمة. */
const LIFE_BURDEN_TOKENS = new Set([
  "الدنيا", "دنيا", "هالدنيا", "الحياه",
  "حياه", "هالحياه", "العيشه", "هالعيشه",
  "العالم", "الوجود", "الكون", "هادنيا",
]);

/** ملكية الحياة/الوجود: «حياتي»، «وجودي»، «بقايي» (بعد التطبيع من «بقائي») — شخصية لا عامة. */
const LIFE_SELF_TOKENS = new Set([
  "حياتي", "حياتنا", "حياته", "حياتها",
  "حياتهم", "وجودي", "وجوده", "وجودها",
  "بقايي", "بقايه", "بقاه", "عمري",
]);

/** أفعال المغادرة والاختفاء (لا «أكون»/«موجود»: تُستعمل في كلام عادي مشروع). */
const DEPARTURE_TOKENS = new Set([
  "اختفي", "ارحل", "امشي", "اترك",
  "اخرج", "اهرب", "اتلاشي", "اختفيت",
]);

/** ألفاظ الثقل على النفس. */
const SELF_BURDEN_TOKENS = new Set([
  "عبء", "عبو", "عاله", "عالي",
  "ثقيل", "حمل", "زايد", "عبيا",
]);

/** أدوات النفي والعجز. */
const NEGATION_OR_INABILITY = new Set([
  "لا", "ما", "مش", "مو",
  "ليس", "ليست", "لم", "لن",
  "ماني", "مانيش", "ماش", "ماشي",
  "ييست", "فقدت",
]);

/** ألفاظ التأبيد التي تُقرن بطلب الخلاص («أرتاح للأبد»). */
const FOREVER_TOKENS = new Set([
  "الابد", "ابد", "ابديه", "ابدي",
  "نهاييا", "خلاص", "لابد",
]);

/** أفعال إنهاء الحياة («أتمنى أن تنتهي حياتي»). */
const END_VERBS = new Set([
  "تنتهي", "ينتهي", "انتهاء", "تخلص",
  "تقف", "تنته", "ينته", "انهي",
  "ينهي", "تنهي", "انهيه", "انهيها",
  "انهيهم",
]);

/** قرارٌ مُعلن بإنهاء الأمر: «خلاص قررت أنهي كل شي». */
const DECISION_TOKENS = new Set([
  "قررت", "قررنا", "عزمت", "نويت",
  "حسمت", "خلصت", "اخترت",
]);

/**
 * طرق إيذاء النفس. لا تعمل وحدها أبداً — بل مع مفعول النفس في نافذة قريبة،
 * وإلا التقطت كلاماً مشروعاً («قطعت صلتي به»، «رميت الوسواس»).
 */
const METHOD_TOKENS = new Set([
  "اشنق", "شنق", "اخنق", "خنق",
  "اقطع", "قطع", "احرق", "حرق",
  "ارمي", "رمي", "اقتل", "قتل",
  "اذبح", "ذبح", "اغرق", "غرق",
  "اطعن", "طعن",
]);

/** مفعول النفس الذي يجعل فعل الطريقة إيذاءً للنفس. */
const SELF_OBJECT_TOKENS = new Set([
  "نفسي", "نفس", "حالي", "حال",
  "روحي", "روح", "ذاتي", "شراييني",
  "شرايين", "معصمي", "معاصمي", "رسغي",
  "رسغ", "وريدي", "يدي", "عنقي",
  "رقبتي",
]);

/** طلب طريقة/وسيلة للموت: «وش أسهل طريقة للموت»، «أدور طريقة أموت فيها». */
const METHOD_SEEK_TOKENS = new Set([
  "طريقه", "طرق", "وسيله", "وسايل",
  "اسهل", "اسرع", "كيفيه", "كيف",
  "ادور", "دور", "ابحث", "فتش",
  "وصفه", "طريق",
]);

/** جرعة زائدة/أدوية تُطلب للراحة أو الموت. */
const OVERDOSE_TOKENS = new Set([
  "حبوب", "حبه", "حبات", "منوم",
  "منومه", "منومات", "مهدي", "مهديات",
  "سم", "سموم", "جرعه", "جرعات",
  "ملغ", "مليجرام", "ملجم", "عقاقير",
  "اقراص", "قرص",
]);

/** سلوك تحضيري يسبق الأزمة (كتابة وصية، تجهيز). أفعال لا أسماء. */
const PREPARATION_VERBS = new Set([
  "كتبت", "بكتب", "جهزت", "جهزه",
  "اعددت", "حضرت", "ودعت", "وزعت",
  "انهيت",
]);

/** ألفاظ انعدام المعنى والقيمة. */
const HOPELESS_TOKENS = new Set([
  "لازمه", "قيمه", "معني", "فايده",
  "طعم", "هدف", "مبرر", "داعي",
  "ثمن", "اهميه", "معناها", "لازم",
]);

/** ألفاظ المعنى التي تُنفى: «لا أرى سبباً لبقائي حياً». */
const MEANING_TOKENS = new Set([
  "سبب", "اسباب", "مبرر", "داعي",
  "فايده", "قيمه", "معني", "هدف",
  "لازمه",
]);

/** الإنهاك والضيق — مع ما يُنهك منه (الدنيا/الحياة/النفس) لا مع أي متعب. */
const EXHAUSTION_TOKENS = new Set([
  "تعبت", "تعبان", "تعبانه", "مليت",
  "مللت", "زهقت", "زهقان", "ييست",
  "طفحت", "قرفت", "هلكت", "اعيت",
  "اعيان", "مخنوق", "مختنق", "ضايق",
  "تضيق", "ضاقت", "ييس", "قنطت",
]);

/** الشعور/الإحساس — قرينة على أن الوصف شخصي لا بحثي. */
const FEELING_TOKENS = new Set([
  "احس", "اشعر", "احساس", "شعور",
  "شاعر", "شاعره", "حاسس", "حاسه",
  "حسيت", "احسست",
]);

/** أشخاص: «عبء على أهلي». تمنع التقاط «الذنوب عبء على القلب». */
const PERSON_TOKENS = new Set([
  "اهلي", "اهل", "اسرتي", "اسره",
  "عايلتي", "عايله", "امي", "ابوي",
  "ابي", "اخوي", "اخوتي", "اخواتي",
  "زوجتي", "زوجي", "الناس", "احد",
  "غيري", "الكل", "اصدقايي", "ولدي",
  "بنتي", "من حولي",
]);

/**
 * من يُتمنَّى له الموت: تمنّي الموت **للغير** ليس إيذاءً للنفس
 * («أتمنى الموت لأعداء الإسلام»، «ما حكم الدعاء على الظالم بالموت»).
 */
const OTHER_TARGET_TOKENS = new Set([
  "اعداء", "عدو", "عدوي", "الظالم",
  "الظالمين", "الكفار", "الكافرين", "المشركين",
  "المنافقين", "فلان", "غيري", "اليهود",
]);

/**
 * الإطار البحثي: إن فصل أحد هذه الألفاظ بين الرغبة والموت فالجملة سؤالٌ عن الموت
 * لا نيةٌ فيه («أريد أن أذكر الموت»، «أبحث عن أحكام الجنائز»، «ما حكم تمني الموت»).
 */
const RESEARCH_FRAME_TOKENS = new Set([
  "ذكر", "تذكر", "اتذكر", "اذكر",
  "اتعظ", "عظه", "بحث", "موضوع",
  "مواضيع", "حكم", "احكام", "فتوي",
  "حديث", "احاديث", "ايه", "ايات",
  "تفسير", "معني", "معاني", "قصه",
  "قصص", "روايه", "سكرات", "احتضار",
  "جنازه", "جنايز", "قبر", "قبور",
  "الاموات", "الموتي", "ميت", "خوف",
  "الاستعداد", "استعداد", "اداب", "فضل",
  "دليل", "علامات", "تعلم", "دراسه",
  "فهم", "معرفه", "قراءه", "شرح",
  "كتاب", "رساله", "عقيده", "ايمان",
  "يقين", "شوق", "لقاء", "تغيير",
  "تغير", "استعد", "شهيدا", "شهيد",
  "الجنه", "الفردوس", "الاخره", "القيامه",
  "البرزخ", "الخاتمه", "مواريث", "الميراث",
  "الزهد", "الرقاق", "التذكير",
]);

/** تجريد السوابق الشائعة من وحدة نصية لمقارنتها بالمجموعات أعلاه. */
function canonToken(token: string): string {
  let t = token;
  for (const prefix of ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"]) {
    if (t.startsWith(prefix) && t.length - prefix.length >= 3) {
      t = t.slice(prefix.length);
      break;
    }
  }
  return t;
}

const ARABIC_PREFIXES = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل", "ما", "مان"];

/**
 * كل الصور الصرفية المقابلة لوحدة نصية واحدة.
 *
 * السبب: اللهجات تلصق النفي والسوابق بالكلمة نفسها، فالبحث عن الصورة الحرفية وحدها
 * يفوّت الأزمة:
 *   • مغربي/ليبي: «ما بغيتش نعيش»، «مانبيش نعيش» — النفي لاحقة «ـش» على الفعل.
 *   • «مانبيش» نفي+رغبة في كلمة واحدة.
 *   • «بالموت»، «للأبد»، «هالدنيا» سوابق ملتصقة.
 */
function canonForms(token: string): string[] {
  const forms = new Set<string>([token]);
  const add = (t: string) => {
    if (t.length >= 3) forms.add(t);
  };
  // تُجرَّب الصور المشتقة من كل متغيّر، ومن كل متغيّر مُجرَّد من لاحقته أيضاً.
  const push = (t: string) => add(t);
  // لاحقة التنوين الكتابية: «سبباً» تُطبَّع إلى «سببا»، والأصل «سبب».
  const variants = [token];
  if (token.endsWith("ش") && token.length >= 5) variants.push(token.slice(0, -1));
  if (token.endsWith("ا") && token.length >= 4) variants.push(token.slice(0, -1));
  for (const base of variants) {
    if (!base) continue;
    add(base);
    push(base);
    if (base.endsWith("ا") && base.length >= 4) push(base.slice(0, -1));
    if (base.endsWith("ش") && base.length >= 5) {
      const noSh = base.slice(0, -1);
      push(noSh);
      if (noSh.endsWith("ا") && noSh.length >= 4) push(noSh.slice(0, -1));
    }
    for (const prefix of ARABIC_PREFIXES) {
      if (base.startsWith(prefix) && base.length - prefix.length >= 3) add(base.slice(prefix.length));
    }
  }
  return [...forms];
}

/** هل تنتمي هذه الوحدة إلى المجموعة بأيٍّ من صورها؟ */
function inGroup(token: string, group: Set<string>): boolean {
  for (const form of canonForms(token)) {
    if (group.has(form)) return true;
  }
  return false;
}

/** نفي+رغبة ملتصقان في كلمة واحدة (مغربي/ليبي): «مانبيش»، «ماوديش». */
function isFusedNegatedDesire(token: string): boolean {
  if (!token.startsWith("ما") || !token.endsWith("ش")) return false;
  const core = token.slice(2, -1);
  if (core.length < 2) return false;
  for (const prefix of ["", "ن", "ي", "ت", "ا"]) {
    if (DESIRE_TOKENS.has(prefix + core) || DESIRE_TOKENS.has(core.slice(prefix.length))) return true;
  }
  return DESIRE_TOKENS.has(core);
}

function isNegatedAt(tokens: string[], index: number): boolean {
  for (let back = 1; back <= 2; back += 1) {
    const prev = tokens[index - back];
    if (prev === undefined) break;
    if (NEGATION_TOKENS.has(canonToken(prev))) return true;
  }
  return false;
}

function findInRange(
  tokens: string[],
  from: number,
  span: number,
  group: Set<string>,
): { index: number; token: string } | null {
  const start = Math.max(0, from);
  for (let i = start; i < Math.min(tokens.length, start + span); i += 1) {
    const canon = canonToken(tokens[i]);
    if (group.has(canon) || inGroup(tokens[i], group)) return { index: i, token: canon };
  }
  return null;
}

/** هل فصل إطار بحثي بين موضعين؟ */
function researchFrameBetween(tokens: string[], from: number, to: number): boolean {
  for (let i = Math.max(0, from); i < to; i += 1) {
    if (RESEARCH_FRAME_TOKENS.has(canonToken(tokens[i]))) return true;
  }
  return false;
}

/**
 * هل سبق الموضعَ إطارٌ بحثي في الجملة نفسها؟ تُستعمل مع قواعد الطرق والأساليب،
 * لأن «ما حكم قتل النفس» و«كيف أستعد للموت» سؤالان علميان بينما «كيف أقتل نفسي»
 * أزمة. الفرق ليس في الفعل بل في الإطار الذي جاء فيه.
 */
function researchFrameBefore(tokens: string[], index: number, span: number = 3): boolean {
  for (let i = Math.max(0, index - span); i < index; i += 1) {
    if (RESEARCH_FRAME_TOKENS.has(canonToken(tokens[i]))) return true;
  }
  return false;
}

/** هل في الجملة كلها إطار بحثي؟ (أشدّ تحفظاً، يُستعمل مع طلب الطريقة). */
function hasResearchFrameAnywhere(tokens: string[]): boolean {
  return tokens.some((t) => RESEARCH_FRAME_TOKENS.has(canonToken(t)));
}

/** تمنّي الموت للغير: «أتمنى الموت لأعداء الإسلام» ليست إيذاءً للنفس. */
function otherTargetAfter(tokens: string[], index: number): boolean {
  const hit = findInRange(tokens, index + 1, 3, OTHER_TARGET_TOKENS);
  return hit !== null;
}

/**
 * الفحص التركيبي: نيةٌ شخصية في ترك الحياة مركَّبةٌ من عناصر، لا عبارة محفوظة.
 * هذا هو الجزء الذي يجعل الكاشف يعمّم على صياغات لم تُكتب في المعجم.
 *
 * القاعدة الحاكمة: الخطأ نحو «تفعيل السلامة» أولى من الخطأ نحو تجاهلها — ردّ
 * السلامة توجيه لطيف لمختص لا اتهام — **لكن** ذكر الموت أو الدنيا أو الراحة بوصفه
 * موضوعاً بحثياً يبقى غير مفعِّل. كل قاعدة أدناه مقيَّدة بشيء شخصي (مفعول النفس،
 * ملكية الحياة، شخص، نفي، رغبة) لهذا السبب بالذات.
 */
export function detectComposedCrisis(norm: string): boolean {
  const tokens = norm.split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  const researchSomewhere = hasResearchFrameAnywhere(tokens);

  for (let i = 0; i < tokens.length; i += 1) {
    const canon = canonToken(tokens[i]);

    // (١) رغبة مؤكَّدة + موت، بلا إطار بحثي فاصل ولا تمنٍّ للغير.
    if (DESIRE_TOKENS.has(canon) && !isNegatedAt(tokens, i)) {
      const death = findInRange(tokens, i + 1, 4, DEATH_TOKENS);
      if (death && !researchFrameBetween(tokens, i + 1, death.index) && !otherTargetAfter(tokens, death.index)) {
        return true;
      }

      // (٢) رغبة + مغادرة/اختفاء + ما يُغادَر منه: «أبغى أختفي من الدنيا».
      const departure = findInRange(tokens, i + 1, 4, DEPARTURE_TOKENS);
      if (departure && !researchFrameBetween(tokens, i + 1, departure.index)) {
        if (findInRange(tokens, departure.index + 1, 3, LIFE_BURDEN_TOKENS)) return true;
        // «الدنيا تضيق فيني وأبغى أخرج منها»: المرجع ضمير يعود على الدنيا المذكورة.
        const ref = findInRange(tokens, departure.index + 1, 3, new Set([
  "منها", "منه", "منهاش",
]));
        if (ref && tokens.slice(0, departure.index).some((t) => inGroup(t, LIFE_BURDEN_TOKENS))) {
          return true;
        }
      }

      // (٣) رغبة + إنهاء + حياة مملوكة: «أتمنى أن تنتهي حياتي».
      const end = findInRange(tokens, i + 1, 4, END_VERBS);
      if (end && findInRange(tokens, end.index + 1, 3, LIFE_SELF_TOKENS)) return true;
    }

    // (٤) نفي/عجز + رغبة أو قدرة + حياة/استمرار: «ما أبغى أعيش»، «ما أقدر أكمل».
    if (NEGATION_OR_INABILITY.has(canon)) {
      const desire = findInRange(tokens, i + 1, 3, DESIRE_TOKENS);
      if (desire) {
        const live = findInRange(tokens, desire.index + 1, 3, LIVE_TOKENS);
        if (live && !researchFrameBetween(tokens, desire.index + 1, live.index)) return true;
      }
      const ability = findInRange(tokens, i + 1, 3, LIVE_TOKENS);
      if (
        ability &&
        ["اقدر", "اكدر", "قادر", "قادره", "فيني", "طاقه", "طاقه", "استمر", "اكمل"].includes(ability.token) &&
        findInRange(tokens, ability.index + 1, 3, LIVE_TOKENS)
      ) {
        return true;
      }

      // (٥) نفي + بقاء/استمرار + الدنيا: «ما باقي لي شي بهالدنيا».
      if (ability && findInRange(tokens, ability.index + 1, 4, LIFE_BURDEN_TOKENS)) {
        if (!researchFrameBetween(tokens, ability.index + 1, tokens.length)) return true;
      }

      // (٦) نفي + انعدام المعنى + حياة شخصية: «لا أرى سبباً لبقائي حياً».
      const meaning = findInRange(tokens, i + 1, 4, MEANING_TOKENS);
      if (meaning) {
        const personal = findInRange(tokens, meaning.index + 1, 4, PERSONAL_LIVE_TOKENS);
        const self = findInRange(tokens, meaning.index + 1, 4, LIFE_SELF_TOKENS);
        if (personal || self) return true;
      }
    }

    // (٧) فعل خلاص + ما يُطلب الخلاص منه: «أرتاح من الدنيا»، «تعبت وودي أرتاح».
    if (REST_VERBS.has(canon) && !isNegatedAt(tokens, i)) {
      const burdenAfter = findInRange(tokens, i + 1, 3, LIFE_BURDEN_TOKENS);
      if (burdenAfter && !researchFrameBetween(tokens, i + 1, burdenAfter.index)) return true;

      const burdenBefore = findInRange(tokens, i - 3, 3, LIFE_BURDEN_TOKENS);
      if (burdenBefore && burdenBefore.index < i) {
        const desire = findInRange(tokens, burdenBefore.index + 1, 4, DESIRE_TOKENS);
        const forever = findInRange(tokens, i + 1, 3, FOREVER_TOKENS);
        if (desire || forever) return true;
      }

      // (٨) خلاص + تأبيد: «ودي أرتاح راحة أبدية»، «تعبت وودي أرتاح للأبد».
      // الجنة/الآخرة تُبقيها أمنيةً مشروعة لا أزمة.
      // الجنة/الفردوس/الآخرة بين الفعل والتأبيد تُبقيها أمنيةً مشروعة لا أزمة
      // («أبغى أرتاح في الجنة للأبد»).
      const forever = findInRange(tokens, i + 1, 3, FOREVER_TOKENS);
      if (forever && !researchFrameBetween(tokens, i + 1, forever.index)) return true;
    }

    // (٩) ثقلٌ على النفس + مغادرة/اختفاء: «أحس إني عبء وأبغى أختفي».
    if (SELF_BURDEN_TOKENS.has(canon)) {
      if (findInRange(tokens, i + 1, 5, DEPARTURE_TOKENS)) return true;
      // (١٠) ثقلٌ على النفس + شخص: «ما أبغى أكون عبء على أحد»، «وجودي عبء على أسرتي».
      if (findInRange(tokens, i + 1, 4, PERSON_TOKENS)) return true;
      if (findInRange(tokens, i - 4, 4, PERSON_TOKENS)) return true;
    }

    // (١١) طريقة إيذاء + مفعول النفس: «أشنق نفسي»، «بدي أقتل حالي»، «بقطع شراييني».
    if (METHOD_TOKENS.has(canon) && !researchFrameBefore(tokens, i)) {
      if (findInRange(tokens, i + 1, 3, SELF_OBJECT_TOKENS)) return true;
    }

    // (١٢) طلب طريقة للموت: «وش أسهل طريقة للموت»، «أدور طريقة أموت فيها».
    if (METHOD_SEEK_TOKENS.has(canon) && !researchSomewhere) {
      if (findInRange(tokens, i + 1, 4, DEATH_TOKENS)) return true;
    }

    // (١٣) جرعة/دواء + راحة أو موت أو تأبيد: «بشرب حبوب وأرتاح للأبد».
    if (OVERDOSE_TOKENS.has(canon) && !researchSomewhere) {
      if (
        findInRange(tokens, i + 1, 4, REST_VERBS) ||
        findInRange(tokens, i - 4, 4, REST_VERBS) ||
        findInRange(tokens, i + 1, 4, DEATH_TOKENS) ||
        findInRange(tokens, i + 1, 4, FOREVER_TOKENS)
      ) {
        return true;
      }
    }

    // (١٤) سلوك تحضيري + موت/انتحار: «بكتب وصيتي قبل ما أموت»، «جهزت كل شي للانتحار».
    if (PREPARATION_VERBS.has(canon) && !researchSomewhere) {
      if (findInRange(tokens, i + 1, 5, DEATH_TOKENS)) return true;
    }

    // (١٥) انعدام قيمة الحياة المملوكة: «حياتي ما لها لازمة»، «وجودي ما له معنى».
    if (LIFE_SELF_TOKENS.has(canon)) {
      if (findInRange(tokens, i + 1, 4, HOPELESS_TOKENS)) return true;
    }

    // (١٦) إنهاك/ضيق + الدنيا أو الحياة المملوكة: «مليت من حياتي»، «الدنيا تضيق فيني».
    // اتجاهية عمداً: «مليت من حياتي» أزمة، أما «حياتي تعبت بسبب ذنوبي» و
    // «الدنيا ضاقت علي» فشكوى دينية — وهما من مرادفات الأبواب المعروضة في الواجهة،
    // فرفضهما بردّ سلامة يكون خطأً ظاهراً للمستخدم.
    if (EXHAUSTION_TOKENS.has(canon)) {
      if (findInRange(tokens, i + 1, 4, LIFE_BURDEN_TOKENS)) return true;
      if (findInRange(tokens, i + 1, 4, LIFE_SELF_TOKENS)) return true;
    }

    // (١٧) موت + وصفه بالحلّ: «الموت هو الحل».
    if (DEATH_TOKENS.has(canon)) {
      const solution = findInRange(tokens, i + 1, 3, new Set([
  "الحل", "حل", "الوحيد", "المخرج",
]));
      if (solution && !isNegatedAt(tokens, solution.index)) return true;
    }

    // (١٨) قرار مُعلن + إنهاء/موت: «خلاص قررت أنهي كل شي».
    if (DECISION_TOKENS.has(canon)) {
      if (findInRange(tokens, i + 1, 4, END_VERBS)) return true;
      if (findInRange(tokens, i + 1, 4, DEATH_TOKENS)) return true;
    }

    // (١٩) نفي+رغبة ملتصقان (مغربي/ليبي): «مانبيش نعيش»، «ماوديش نكمل».
    if (isFusedNegatedDesire(tokens[i])) {
      if (findInRange(tokens, i + 1, 3, LIVE_TOKENS)) return true;
      if (findInRange(tokens, i + 1, 3, DEATH_TOKENS)) return true;
    }
  }

  return false;
}

export function detectSafetyRisk(query: string): boolean {
  const norm = normalizeArabic(query);
  if (!norm) return false;

  // ذكر «الموت» وحده، أو الحديث عنه بوصفه موضوعاً، ليس علامة خطر.
  // نبحث فقط عن عبارات تعبّر عن نية أو رغبة شخصية في إيذاء النفس/الموت،
  // مع معاملة النفي لكل وقوع على حدة بدل إسقاط الجملة كلها.
  if (SELF_HARM_MARKERS.some((m) => hasAffirmativeMarker(norm, normalizeArabic(m)))) return true;

  if (SAFETY_PATTERNS.some((p) => hasAffirmativePattern(norm, p))) return true;

  // الطبقة التركيبية: تلتقط ما لم يُكتب في المعجم صراحةً.
  return detectComposedCrisis(norm);
}

/**
 * للتدقيق الآلي فقط: معجم السلامة كما هو مكتوب في الكود.
 *
 * السبب: مجموعات الطبقة التركيبية تُقارن بوحدات نصية مأخوذة من **النص المطبَّع**،
 * فلا تُطبَّع مرة أخرى عند المقارنة. أي مفردة تُكتب بهمزة أو تاء مربوطة أو ألف
 * مقصورة («أصحي» بدل «اصحي»، «نومة» بدل «نومه») لا تطابق شيئاً أبداً وتبقى ميّتة
 * في المعجم. وقد وقع هذا الخطأ فعلاً في قائمة ألفاظ التجاهل في الاسترجاع، فأغلب
 * مدخلاتها لم يكن يعمل. اختبار الانحدار في `tests/safety.test.ts` يفحص هذه القاعدة.
 */
export const SAFETY_LEXICON: Readonly<Record<string, readonly string[]>> = {
  SELF_HARM_MARKERS,
  SAFETY_PATTERN_SOURCES: SAFETY_PATTERNS.map((pattern) => pattern.source),
  DESIRE_TOKENS: [...DESIRE_TOKENS],
  DEATH_TOKENS: [...DEATH_TOKENS],
  LIVE_TOKENS: [...LIVE_TOKENS],
  PERSONAL_LIVE_TOKENS: [...PERSONAL_LIVE_TOKENS],
  REST_VERBS: [...REST_VERBS],
  LIFE_BURDEN_TOKENS: [...LIFE_BURDEN_TOKENS],
  LIFE_SELF_TOKENS: [...LIFE_SELF_TOKENS],
  DEPARTURE_TOKENS: [...DEPARTURE_TOKENS],
  SELF_BURDEN_TOKENS: [...SELF_BURDEN_TOKENS],
  NEGATION_OR_INABILITY: [...NEGATION_OR_INABILITY],
  FOREVER_TOKENS: [...FOREVER_TOKENS],
  END_VERBS: [...END_VERBS],
  DECISION_TOKENS: [...DECISION_TOKENS],
  METHOD_TOKENS: [...METHOD_TOKENS],
  SELF_OBJECT_TOKENS: [...SELF_OBJECT_TOKENS],
  METHOD_SEEK_TOKENS: [...METHOD_SEEK_TOKENS],
  OVERDOSE_TOKENS: [...OVERDOSE_TOKENS],
  PREPARATION_VERBS: [...PREPARATION_VERBS],
  HOPELESS_TOKENS: [...HOPELESS_TOKENS],
  MEANING_TOKENS: [...MEANING_TOKENS],
  EXHAUSTION_TOKENS: [...EXHAUSTION_TOKENS],
  FEELING_TOKENS: [...FEELING_TOKENS],
  PERSON_TOKENS: [...PERSON_TOKENS],
  OTHER_TARGET_TOKENS: [...OTHER_TARGET_TOKENS],
  RESEARCH_FRAME_TOKENS: [...RESEARCH_FRAME_TOKENS],
};

/**
 * رد السلامة: لا محتوى دينياً، لا تشخيص، لا وصف — توجيه فوري لمساعدة بشرية.
 */
export const SAFETY_RESPONSE: SafetyInfo = {
  title: "سلامتك أولاً — نحتاج أن نُوجِّهك لمختص",
  message:
    "ما تصفه يشير إلى حالة تحتاج دعماً متخصصاً من مختص نفسي أو طبي. رفيق القلوب أداة بحث علمي فقط، وهي غير مؤهلة للتعامل مع هذه الحالات، ولن تعرض لك محتوى بحثياً الآن. نرجو منك طلب مساعدة بشرية متخصصة فورًا.",
  steps: [
    "تحدّث الآن مع شخص تثق به — قريب، صديق، أو شخص مقرّب — وأخبره بما تمرّ به.",
    "اتصل بخدمات الطوارئ في بلدك فوراً، أو توجّه إلى أقرب قسم طوارئ.",
    "إن كان في بلدك خطاً ساخناً للدعم النفسي أو الوقاية، فاتصل به الآن دون تأخير.",
    "لا تبقَ وحدك في هذه اللحظة؛ البقاء مع أحدهم يصنع فرقاً حقيقياً.",
  ],
};
