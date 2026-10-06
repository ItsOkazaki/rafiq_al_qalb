// ─────────────────────────────────────────────────────────────────────────────
// محرك الاسترجاع المضبوط (Controlled Retrieval)
// لا يسترجع إلا من CHUNKS المرتبطة بمصادر active في السجل وغير مستبعدة.
// إن لم توجد مادة كافية → يمتنع ولا يخترع.
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_CHUNKS } from "@/lib/corpus/chunks";
import { TOPICS } from "@/lib/rag/topics";
import { ACTIVE_SOURCES, getSourceById, isRetrievableSourceId, isExcludedSourceTitle } from "@/lib/sources/registry";
import { toRetrievedPassage } from "@/lib/corpus/passages";
import { normalizeArabic, tokenizeArabic } from "@/lib/text/arabic";
import type { CorpusChunk, RetrievedPassage, TopicMatch } from "@/lib/types";

/** الحد الأقصى لعدد المقاطع المسترجعة في النتيجة الواحدة (RAG limit). */
export const MAX_PASSAGES = 4;

/** العتبة الدنيا لقبول المقطع — لكن القبول يتطلب أيضاً صلة مباشرة أو موضوعية واضحة. */
export const MIN_PASSAGE_SCORE = 3;

/**
 * الحد الأدنى لطول نص المقطع المسترجَع.
 * المداخل الفهرسية الموجزة جداً (سطر واحد من نتيجة بحث) تصلح للتوجيه فقط،
 * ولا تُعرض كمادة دليل؛ فوجودها في النتيجة يُفقد البطاقة معناها.
 */
export const MIN_PASSAGE_TEXT_LENGTH = 40;

/**
 * نسبة شيوع اللفظ التي تفصل «المميِّز» من «العام» في المادة المعتمدة.
 * اللفظ الوارد في أكثر من هذه النسبة من المقاطع عامٌّ: مطابقته لا تُثبت صلة.
 */
export const DISTINCTIVE_DF_FRACTION = 0.02;

const GENERIC_QUERY_TOKENS = new Set([
  "الله", "الناس", "العبد", "العباد", "الدنيا", "الاخره", "شيء", "امر", "امور",
  "موضوع", "موضوعات", "بحث", "ماده", "مادة", "العلم", "العلمية", "الحديث", "السؤال",
  // أفعال/ألفاظ السؤال الوصفية لا تغطي موضوعاً («ما معنى كلمة حرام؟»): لا
  // تُحتسب دليلاً على صلة مقطع لمجرد ورودها في شرح طويل.
  "معنى", "معني", "معاني", "كلمه", "كلمة", "تعريف", "مفهوم", "شرح", "مصطلح",
  "ما", "من", "هو", "هي", "في", "عن", "هل", "هذا", "هذه", "ذلك", "تلك", "الى",
  "لماذا", "كيف", "ماذا", "اريد", "أريد", "رأي", "راي", "قول", "أفضل", "افضل",
  // كلمات وصفية عن المصدر نفسه لا عن مضمونه («ما الذي تقوله الرسالة الرسمية عن…»):
  // تُستثنى من حساب تغطية السؤال حتى لا تُسقِط بحثاً موضوعياً صحيحاً.
  // تُكتب بالشكل المطبَّع (ة←ه، مع سابقات مجرّدة) لأن المقارنة تجري بعد التطبيع والتقطيع.
  "الرسالة", "رسالة", "الرساله", "رساله", "الرسمية", "الرسميه", "الرسمي", "رسمي",
  "المنشورة", "المنشوره", "منشورة", "منشوره", "المنشور", "منشور",
  "لاعب", "كرة", "كره", "قدم", "الاول", "الأول", "كامل", "كاملة", "تفسير", "ايه", "آيه", "اية", "آية", "سورة", "سوره",
]);

const QURAN_QUERY_HINTS = ["قرآن", "مصحف", "آية", "اية", "آيه", "ايه", "سورة", "سوره"]
  .map(normalizeArabic);
const AUTHORITY_QUERY_HINTS = ["رأي", "راي", "قول", "موقف"] .map(normalizeArabic);
const IGNORED_AUTHOR_TOKENS_RAW = new Set([
  "الشيخ", "شيخ", "الإمام", "الامام", "رحمه", "الله", "بن", "ابن", "عبد",
  "الرئاسة", "رئاسة", "العامة", "العلمية", "علميه", "بحوث", "الإفتاء", "افتاء",
  "شركة", "حرف", "تقنية", "لتقنية", "معلومات", "تعاون", "مجمع", "ملك",
  "لطباعة", "مصحف", "شريف", "القرآن", "قران", "كريم", "وتفسير", "ميسر",
  "محمد", "عبدالعزيز", "عبد",
  // ألفاظ دينية عامة كانت تُحتسب «اسم مؤلف» فتُسند إلى مصدر لم يُذكر مؤلفه في
  // السؤال: «الإسلام» في اسم ابن تيمية، و«نص/تفسير» في اسم مصدر المصحف.
  "الاسلام", "اسلام", "الدين", "دين", "علامه", "محدث", "فقيه", "نص", "تفسير",
  "العزيز", "عزيز", "السنة", "سنه", "النبوية", "نبويه",
]);

/**
 * مجموعة التجاهل بصيغتها الفعلية بعد التطبيع وتجريد السوابق.
 * كانت المجموعة السابقة مكتوبة بأشكال غير مطبَّعة («الإمام»، «الرئاسة») بينما
 * المقارنة تجري على وحدات مطبَّعة ومجرَّدة («امام»، «رئاسه») — أي أن معظمها لم
 * يكن يعمل إطلاقاً.
 */
const IGNORED_AUTHOR_TOKENS: Set<string> = (() => {
  const out = new Set<string>();
  for (const token of IGNORED_AUTHOR_TOKENS_RAW) {
    const normalized = normalizeArabic(token);
    if (!normalized) continue;
    out.add(normalized);
    out.add(canonicalSearchToken(normalized));
  }
  out.delete("");
  return out;
})();

function canonicalSearchToken(token: string): string {
  let t = normalizeArabic(token);
  if (!t) return "";

  for (const prefix of ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"]) {
    if (t.startsWith(prefix) && t.length - prefix.length >= 3) {
      t = t.slice(prefix.length);
      break;
    }
  }

  for (const suffix of ["هما", "هم", "هن", "كما", "كم", "كن", "نا", "ها", "ه", "ي", "ك", "ين", "ون", "ان", "ات"]) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 3) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }

  // صيغ المضارع: «يموت/تموت/نموت» ← «موت»؛ مع إبقاء الاسم الأصلي قبلها.
  // لا نحذف الألف الابتدائية تعميماً: «أسهم» (الأسهم المالية) كانت تُختزل إلى
  // «سهم» وتطابق كلمة عارضة في شرح حديث، فتُرجع مقطع «عمدة القاري» لسؤال سوقٍ
  // خارج النطاق. الألف بداية أسماء كثيرة، بخلاف ياء/تاء/نون المضارعة الأوضح.
  if (t.length >= 4 && /^[يتن]/.test(t)) {
    const verbStem = t.slice(1);
    if (verbStem.length >= 3) t = verbStem;
  }

  return t;
}

function tokenVariants(token: string): string[] {
  const normalized = normalizeArabic(token);
  const canonical = canonicalSearchToken(normalized);
  return [...new Set([normalized, canonical].filter(Boolean))];
}


function isQuranSpecificQuery(norm: string): boolean {
  return QURAN_QUERY_HINTS.some((hint) => hint && norm.includes(hint));
}

/** إشارات طلب تفسير/معنى نص قرآني بعينه، لا مجرد ذكر القرآن في السؤال. */
const QURAN_REQUEST_CUES = [
  "تفسير", "تفسيرا", "معنى", "معاني", "شرح", "اعراب", "سبب النزول", "سبب نزول",
  "قراءه", "قراءات", "ما تفسير", "ما معنى", "ما اعراب",
].map(normalizeArabic);
const QURAN_REFERENCE_RE = /(?:سوره|سورة|ايه|آيه|اية|آية)\s*(?:\d+|[\u0621-\u064a]{2,})/;

/**
 * هل السؤال عن نص قرآني بعينه (تفسير آية/سورة)؟
 * ذكر القرآن دون طلب تفسيره («لا أتأثر بالقرآن») ليس سؤالاً عن نص الآية،
 * فلا يُحصر الاسترجاع في مقاطع الآيات وحدها.
 */
function isQuranInterpretationQuery(norm: string): boolean {
  if (!isQuranSpecificQuery(norm)) return false;
  return QURAN_REQUEST_CUES.some((cue) => cue && norm.includes(cue)) || QURAN_REFERENCE_RE.test(norm);
}

function hasAuthorityCue(norm: string): boolean {
  const queryTokens = new Set(tokenizeArabic(norm).map(normalizeArabic));
  return AUTHORITY_QUERY_HINTS.some((hint) => hint && queryTokens.has(hint));
}

/**
 * كل ألفاظ أسماء المؤلفين في المصادر النشطة (بما فيها الأدوات: «ابن»، «بن»،
 *«الشيخ»). تُستعمل لاستثناء ألفاظ الإسناد من مقام تغطية السؤال: اسم المؤلف دليل
 * على **المصدر** وقد حُسم أمره بحصر المصدر، فلا يُطلب وجوده داخل المتن أيضاً.
 */
const AUTHOR_NAME_TOKENS: Set<string> = (() => {
  const out = new Set<string>();
  for (const source of ACTIVE_SOURCES) {
    for (const raw of tokenizeArabic(source.author)) {
      const normalized = normalizeArabic(raw);
      if (!normalized) continue;
      // أرقام سنوات الولادة/الوفاة ليست ألفاظ إسناد بحثية.
      if (!/[\u0600-\u06FF]/.test(normalized)) continue;
      out.add(normalized);
      const canonical = canonicalSearchToken(normalized);
      if (canonical) out.add(canonical);
    }
  }
  return out;
})();

interface ExplicitSources {
  /** كل المصادر التي ذكرها السؤال صراحةً (باسم مؤلف أو بعنوان كتاب). */
  ids: Set<string>;
  /** المصادر المذكورة **باسم مؤلفها** وحدها. */
  authorIds: Set<string>;
  /** هل ذُكر اسم مؤلف مسجّل في السؤال؟ */
  authorMentioned: boolean;
  /** ألفاظ اسم المؤلف التي ظهرت في السؤال — ألفاظ إسناد لا ألفاظ مضمون. */
  authorTokens: Set<string>;
}

/**
 * تحديد المصادر المذكورة صراحةً في السؤال.
 *
 * التمييز بين «ذُكر المؤلف» و«ذُكر عنوان الكتاب» جوهري: عند السؤال عن رأي عالم
 * بعينه لا يجوز أن يُسند القول إلى عالم آخر لمجرد أن عنوان كتابه يشترك في لفظتين
 * مع السؤال. كان «ما رأي ابن القيم في أمراض القلوب؟» يُعيد مادة ابن تيمية لأن
 * عنوان كتابه (أمراض القلوب وشفاؤها) يطابق لفظتين من السؤال.
 */
function findExplicitSources(norm: string): ExplicitSources {
  const ids = new Set<string>();
  const authorIds = new Set<string>();
  const authorTokens = new Set<string>();
  let authorMentioned = false;

  for (const source of ACTIVE_SOURCES) {
    const sourceAuthorTokens = tokenizeArabic(source.author)
      .map(normalizeArabic)
      .filter((t) => t.length >= 3 && !IGNORED_AUTHOR_TOKENS.has(t));
    const titleTokens = tokenizeArabic(source.title)
      .map(normalizeArabic)
      .filter((t) => t.length >= 4 && !GENERIC_QUERY_TOKENS.has(t) && !IGNORED_AUTHOR_TOKENS.has(t));

    const matchingAuthorTokens = sourceAuthorTokens.filter((t) => norm.includes(t));
    const matchingTitleTokens = titleTokens.filter((t) => norm.includes(t));

    if (matchingAuthorTokens.length >= 1) {
      ids.add(source.id);
      authorIds.add(source.id);
      authorMentioned = true;
      for (const token of matchingAuthorTokens) authorTokens.add(token);
    } else if (matchingTitleTokens.length >= 2) {
      ids.add(source.id);
    }
  }

  return { ids, authorIds, authorMentioned, authorTokens };
}

function buildDocumentFrequency(corpus: CorpusChunk[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const chunk of corpus) {
    const seen = new Set<string>();
    for (const token of tokenizeArabic(chunk.text)) {
      for (const variant of tokenVariants(token)) {
        if (!seen.has(variant)) {
          seen.add(variant);
          freq.set(variant, (freq.get(variant) ?? 0) + 1);
        }
      }
    }
    for (const kw of chunk.keywords) {
      for (const token of tokenizeArabic(kw)) {
        for (const variant of tokenVariants(token)) {
          if (!seen.has(variant)) {
            seen.add(variant);
            freq.set(variant, (freq.get(variant) ?? 0) + 1);
          }
        }
      }
    }
  }
  return freq;
}

/**
 * هل يطابق مرادفُ الباب سؤالَ المستخدم؟
 *
 * المطابقة الأساسية بالاحتواء الحرفي. وتُضاف إليها مطابقة تغطية الكلمات للمرادفات
 * متعددة الكلمات: صياغة المستخدم قد تُقدَّم بأداة نفي أو ضمير («ما عاد أتأثر بالموعظة»
 * مقابل مرادف «لا أتأثر بالموعظة»)، فيُقبل المرادف إذا ظهرت **كل** كلماته المعنوية
 * في السؤال بعد التطبيع وتجريد السوابق. الشرط: كلمتان معنويتان على الأقل، حتى لا
 * تتحول كلمة واحدة عامة إلى وسم بابٍ كامل.
 */
/** أشكال الكلمة التي تُقارَن بها المرادفات: المطبَّعة والجذرية («يضيق» ← «ضيق»). */
function matchingForms(token: string): string[] {
  const norm = normalizeArabic(token);
  const canonical = canonicalSearchToken(norm);
  return [...new Set([norm, canonical].filter((t) => t && t.length >= 3))];
}

function synonymMatchesSynonym(norm: string, queryForms: Set<string>, synonym: string): boolean {
  const n = normalizeArabic(synonym);
  if (n) {
    // كلمة قصيرة (٣ أحرف أو أقل) مثل «هم» تطابق كلمةً كاملة فقط، وإلا التقطت
    // «الأسهم» و«أهم» و«فهم» وسَمت سؤالاً بعيداً بأنه بابُ الهم والغم.
    if (!n.includes(" ") && n.length <= 3) {
      return queryForms.has(n);
    }
    if (norm.includes(n)) return true;
  }
  const tokens = tokenizeArabic(synonym).filter((t) => normalizeArabic(t).length >= 3);
  if (tokens.length < 2) return false;
  return tokens.every((t) => matchingForms(t).some((form) => queryForms.has(form)));
}

export function identifyTopics(query: string, topics = TOPICS): TopicMatch[] {
  const norm = normalizeArabic(query);
  if (!norm) return [];
  const queryForms = new Set(tokenizeArabic(query).flatMap((t) => matchingForms(t)));
  const matches: TopicMatch[] = [];
  for (const topic of topics) {
    let score = 0;
    for (const syn of topic.synonyms) {
      if (synonymMatchesSynonym(norm, queryForms, syn)) score += 2;
    }
    for (const kw of topic.keywords) {
      const n = normalizeArabic(kw);
      if (n && norm.includes(n)) score += 1;
    }
    if (score > 0) matches.push({ topic, score });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

export interface RetrieveOptions {
  matchedTopics?: TopicMatch[];
  limit?: number;
  /** للاختبار: حقن مادة بديلة دون المساس بالمصفوفة الأساسية. */
  corpus?: CorpusChunk[];
}

function filterApproved(corpus: CorpusChunk[]): CorpusChunk[] {
  return corpus.filter((c) => {
    if (!isRetrievableSourceId(c.sourceId)) return false;
    const src = getSourceById(c.sourceId);
    if (src && isExcludedSourceTitle(src.title)) return false;
    return true;
  });
}

/**
 * استرجاع المقاطع الفعلية من المادة المعتمدة فقط.
 * التسجيل: تعزيز الموضوع + مطابقة الكلمات المفتاحية + تداخل الوحدات النصية.
 * قاعدة الدليل اللفظي: وسمُ الباب وحده لا يكفي لقبول المقطع؛ لا بد من
 * دليل لفظي (احتواء عبارة مفتاحية، أو تداخل وحدات نصية، أو احتواء السؤال)
 * حتى لا تُسند إلى المقطع أسئلة لا يذكر شيئاً منها. حارس المصادر المعتمدة
 * (نشطة وغير مستبعدة) يبقى سابقاً على كل حساب.
 */
export function retrievePassages(query: string, opts: RetrieveOptions = {}): RetrievedPassage[] {
  const norm = normalizeArabic(query);
  if (!norm) return [];

  const tokens = new Set(tokenizeArabic(query));
  const matchedTopicIds = new Set(
    (opts.matchedTopics ?? identifyTopics(query)).map((m) => m.topic.id),
  );

  const corpus = opts.corpus ?? ALL_CHUNKS;
  let approved = filterApproved(corpus);

  // طلب قرآني محدد لا يُسند إلى تفسير عام أو كتاب آخر؛ لا بد من مقطع يحمل
  // نص آية/مرجع آية فعلياً. هذا يمنع إجابات مثل «تفسير آية الكرسي» من
  // الانحراف إلى مادة عن موضوع القلب لمجرد تشابه كلمة عابرة.
  const quranSpecific = isQuranInterpretationQuery(norm);
  if (quranSpecific) {
    const quranOnly = approved.filter((chunk) => Boolean(chunk.quranText && chunk.quranReference));
    // لا يُفرغ الحصرُ النتيجةَ: إن لم توجد مادة آيات مطابقة نعود للمادة المعتمدة.
    if (quranOnly.length > 0) approved = quranOnly;
  }

  // عند السؤال عن «رأي/قول/موقف» عالم بعينه، لا نقبل مقطعاً من عالم آخر؛
  // وإذا لم يظهر اسم مؤلف مسجّل في المصادر النشطة، فالمادة غير قابلة للإسناد.
  //
  // قاعدة الإسناد: إذا ذُكر اسم مؤلف، فالإسناد له وحده — ولا يُقبل مصدر عُرف من
  // عنوان كتابه فقط. وبلا اسم مؤلف يبقى العنوان دليلاً كافياً على المصدر المطلوب.
  const explicit = findExplicitSources(norm);
  const authorityCue = hasAuthorityCue(norm);
  const allowedSourceIds =
    authorityCue && explicit.authorMentioned ? explicit.authorIds : explicit.ids;
  /** هل سمّى السؤال مصدراً بعينه فحُصرت المادة فيه؟ */
  const sourceNamedInQuery = allowedSourceIds.size > 0;

  if (authorityCue) {
    if (allowedSourceIds.size === 0) return [];
    approved = approved.filter((chunk) => allowedSourceIds.has(chunk.sourceId));
  } else if (allowedSourceIds.size > 0) {
    approved = approved.filter((chunk) => allowedSourceIds.has(chunk.sourceId));
  }

  const docFreq = buildDocumentFrequency(approved);
  const corpusSize = Math.max(approved.length, 1);
  const queryTokens = [...tokens].map((t) => ({ original: t, variants: tokenVariants(t) }));
  // ألفاظ اسم المؤلف ألفاظ إسناد لا ألفاظ مضمون: السؤال «ما رأي ابن تيمية في أمراض
  // القلوب؟» لا يلزم أن يحتوي المتن على لفظ «تيمية» حتى يكون إسناداً صحيحاً له —
  // فحصر المصدر سبق وأثبته. إبقاؤها في مقام التغطية كان يُسقط أسئلة صحيحة كاملة
  // (امتناع كاذب على مؤلف مسجّل وموضوع مفهرس).
  const isMeaningfulToken = (original: string) => {
    const normalized = normalizeArabic(original);
    if (GENERIC_QUERY_TOKENS.has(normalized)) return false;
    if (explicit.authorTokens.has(normalized)) return false;
    if (explicit.authorTokens.has(canonicalSearchToken(normalized))) return false;
    // اسم المؤلف بأدواته («ابن»، «بن»، «الشيخ») — لا يُطلب داخل المتن.
    if (explicit.authorMentioned) {
      if (AUTHOR_NAME_TOKENS.has(normalized)) return false;
      if (AUTHOR_NAME_TOKENS.has(canonicalSearchToken(normalized))) return false;
    }
    return true;
  };
  const meaningfulQueryTokens = queryTokens.filter(({ original }) => isMeaningfulToken(original)).length;

  /**
   * ألفاظ السؤال «المميِّزة»: النادرة في المادة المعتمدة أو الغائبة عنها.
   *
   * ورود ألفاظ فقهية عامة («حكم»، «صلاة») داخل شرح طويل ليس دليلاً على أن المقطع
   * يجيب عن السؤال؛ فشرحٌ من تسعة عشر ألف حرف يصادف نصف أسئلة الفقه. لذلك متى حمل
   * السؤال لفظاً مميِّزاً — وهو ما يحدد مسألته فعلاً — فلا بد أن يطابقه المقطع.
   * «حكم صلاة الحائض» يحمل «حائض» ولا يذكره المقطع، فيُرفض بدل أن يُعرض مع سطر
   * «حدود المادة». وسؤالٌ كلُّ ألفاظه عامة لا يُعاقب: لا لفظ مميِّز فيه فيُترك
   * للقاعدة اللفظية وحدها.
   */
  const distinctiveDfCap = Math.max(3, corpusSize * DISTINCTIVE_DF_FRACTION);
  const distinctiveQueryForms = new Set(
    queryTokens
      .filter(({ original }) => isMeaningfulToken(original))
      .filter(({ variants }) => Math.max(...variants.map((v) => docFreq.get(v) ?? 0)) <= distinctiveDfCap)
      .map(({ original }) => normalizeArabic(original)),
  );

  const scored = approved
    .map((chunk) => {
      let score = 0;
      // الدليل اللفظي: احتواء عبارة مفتاحية، أو تداخل وحدات نصية،
      // أو احتواء نص المقطع للسؤال كله. وسم الباب وحده لا يُنشئه.
      let lexicalMatch = false;
      let strongLexicalMatch = false;

      // وسم الباب يُحتسب لكل مقطع على حده، لا للسؤال ككل: مطابقة السؤال لبابٍ ما لا
      // تُسند إليه مقطعاً لا يحمل ذلك الوسم.
      let topicMatch = false;
      for (const t of chunk.topics) {
        if (matchedTopicIds.has(t)) {
          score += 3;
          topicMatch = true;
        }
      }

      const chunkNorm = normalizeArabic(chunk.text);
      if (norm.length >= 6 && chunkNorm.includes(norm)) {
        score += 7;
        lexicalMatch = true;
        strongLexicalMatch = true;
      }

      // الكلمات المفتاحية تُقارن كلماتٍ كلمات، لا كعبارة كاملة: «الصبر عند البلاء»
      // يجب أن تُطابق كلمتي «الصبر» و«البلاء» على حدة.
      const keywordTokens = new Set(
        chunk.keywords.flatMap((kw) => tokenizeArabic(kw)).flatMap((tk) => tokenVariants(tk)),
      );
      for (const kw of chunk.keywords) {
        const k = normalizeArabic(kw);
        if (k && norm.includes(k)) {
          score += 3.5;
          lexicalMatch = true;
          const keywordHasSignal = tokenizeArabic(kw)
            .map(normalizeArabic)
            .some((token) => token.length >= 3 && !GENERIC_QUERY_TOKENS.has(token));
          if (keywordHasSignal) strongLexicalMatch = true;
        }
      }

      const chunkTokens = new Set(
        [...tokenizeArabic(chunk.text), ...chunk.keywords.flatMap((kw) => tokenizeArabic(kw))]
          .flatMap((tk) => tokenVariants(tk)),
      );

      let weightedHits = 0;
      let nonGenericMatches = 0;
      let distinctiveMatches = 0;
      for (const { original, variants } of queryTokens) {
        let exact = false;
        let similar = false;
        let bestWeight = 0;
        for (const variant of variants) {
          if (keywordTokens.has(variant)) {
            exact = true;
            bestWeight = Math.max(bestWeight, 3.5);
          }
          if (chunkTokens.has(variant)) {
            exact = true;
            const df = Math.max(docFreq.get(variant) ?? 1, 1);
            const rarity = Math.min(6, 1 + Math.log2((corpusSize + 1) / df));
            bestWeight = Math.max(bestWeight, rarity);
          }
          const canonical = canonicalSearchToken(variant);
          if (canonical && chunkTokens.has(canonical)) {
            similar = true;
            bestWeight = Math.max(bestWeight, 2.5);
          }
        }
        if (exact || similar) {
          lexicalMatch = true;
          weightedHits += bestWeight;
          if (!GENERIC_QUERY_TOKENS.has(variants[0])) {
            nonGenericMatches += 1;
            if (bestWeight >= 3.5) strongLexicalMatch = true;
            if (distinctiveQueryForms.has(normalizeArabic(original))) distinctiveMatches += 1;
          }
        }
      }
      score += Math.min(weightedHits, 8);

      // مداخل الفهرسة مفيدة لتوجيه البحث لكنها ليست بديلاً عن المتن الكامل؛
      // نخفضها قليلاً حتى تتقدم الأدلة الفعلية عند وجودها.
      if (chunk.role === "index") score -= 1.0;

      // سطر فهرسي قصير ليس مادة دليل: لا يُسترجع أصلاً.
      if (chunk.text.trim().length < MIN_PASSAGE_TEXT_LENGTH) return { chunk, score: -1, lexicalMatch: false, relevance: false };

      // إذا لم يطابق الاستعلام موضوعاً محدداً، فلا يكفي وجود كلمة عابرة مشتركة.
      // سؤال عن «تاريخ الدولة الأموية وعمارة قرطبة» يصادف كلمتين في متن حديث،
      // لكنه لا يغطيه؛ فالمقطع ليس إسناداً له. نطلب كلمتين معنويتين مختلفتين
      // وأن تغطّي المطابقات نصف كلمات السؤال المعنوية على الأقل.
      const coverage = meaningfulQueryTokens > 0 ? nonGenericMatches / meaningfulQueryTokens : 0;
      // تغطية كاملة لكلمات السؤال المعنوية (بمطابقات فعلية) دليل قوي بذاتها،
      // حتى لو جاءت أوزان الصيغ المفردة أقل من عتبة «المطابقة القوية» بسبب شيوع الكلمة.
      const fullCoverage = nonGenericMatches >= 2 && coverage >= 0.99;
      // الدليل اللفظي إلزامي: وسم الباب وحده لا يكفي. بعد ذلك تكفي مطابقة
      // الباب، أو تغطية لفظية قوية/كاملة لكلمات السؤال.
      // إن حمل السؤال لفظاً مميِّزاً فلا بد أن يطابقه المقطع؛ وإلا فمطابقة ألفاظ عامة
      // داخل نص طويل لا تُثبت أنه يجيب عن السؤال.
      const distinctiveCovered = distinctiveQueryForms.size === 0 || distinctiveMatches > 0;
      const relevance =
        lexicalMatch &&
        (topicMatch ||
          // سؤالٌ يسمّي مصدراً بعينه (عنوان كتاب أو اسم مؤلِّف) حُصرت مادته في ذلك
          // المصدر، فالإسناد ثابت بحصر المصدر نفسه ولا يُطلب من كل مقطع فيه أن يحمل
          // وسم الباب الذي طابقه السؤال: «أمراض القلوب وشفاؤها لابن تيمية» يسأل عن
          // الكتاب كله لا عن بابٍ بعينه.
          (sourceNamedInQuery && matchedTopicIds.size > 0) ||
          (nonGenericMatches >= 2 &&
            coverage >= 0.5 &&
            (strongLexicalMatch || fullCoverage) &&
            distinctiveCovered));
      return { chunk, score, lexicalMatch, relevance };
    })
    .filter((x) => x.score >= MIN_PASSAGE_SCORE && x.relevance && x.lexicalMatch)
    .sort((a, b) => b.score - a.score);

  const limit = Math.min(opts.limit ?? MAX_PASSAGES, MAX_PASSAGES);

  // تنويع مضبوط للمصادر: نأخذ أعلى مقطع من كل مصدر ذي صلة أولاً، ثم نملأ
  // المواضع المتبقية حسب الدرجة. لا يُخفض هذا عتبة الصلة ولا يُدخل مصدراً
  // لم ينجح مقطعه في الترشيح؛ إنما يمنع مصدراً واحداً من احتكار الحد كله.
  const selected: typeof scored = [];
  const selectedIds = new Set<string>();
  const representedSources = new Set<string>();
  for (const item of scored) {
    if (representedSources.has(item.chunk.sourceId)) continue;
    selected.push(item);
    selectedIds.add(item.chunk.id);
    representedSources.add(item.chunk.sourceId);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    for (const item of scored) {
      if (selectedIds.has(item.chunk.id)) continue;
      selected.push(item);
      selectedIds.add(item.chunk.id);
      if (selected.length >= limit) break;
    }
  }

  const results: RetrievedPassage[] = [];
  for (const { chunk, score } of selected) {
    // الحارس نفسه المستعمل في صفحات المكتبة (src/lib/corpus/passages.ts):
    // مقطع تعذّر توثيق مصدره يُتجاوز بصمت بدل أن يُسقط الطلب كله بخطأ غير مضبوط.
    const passage = toRetrievedPassage(chunk, { score });
    if (passage) results.push(passage);
  }
  return results;
}
