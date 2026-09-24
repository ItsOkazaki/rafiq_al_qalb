"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpenText,
  CircleHelp,
  Compass,
  ExternalLink,
  HeartHandshake,
  Info,
  KeyRound,
  ScrollText,
  ShieldAlert,
  Telescope,
} from "lucide-react";
import type { ResearchResult } from "@/lib/types";
import { PassageCard } from "@/components/passage-card";
import { OrnamentDivider } from "@/components/ornaments";

/** عارض نتيجة البحث الكامل — يعكس بنية الاستجابة حرفياً. */
export function ResearchResultView({ result }: { result: ResearchResult }) {
  if (result.outcome === "safety") return <SafetyView result={result} />;
  if (result.outcome === "fatwa") return <FatwaView result={result} />;
  if (result.outcome === "abstained" || result.outcome === "invalid")
    return <AbstainView result={result} />;
  return <OkView result={result} />;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Compass; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-forest-700">
      <Icon className="size-4.5" strokeWidth={2} />
      {children}
    </h3>
  );
}

function OkView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise space-y-8">
      {/* الأبواب المقترحة (مسار البحث) */}
      <section className="space-y-3">
        <SectionTitle icon={Compass}>الأبواب المقترحة لمسار البحث</SectionTitle>
        {result.topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.topics.map(({ topic }) => (
              <Link
                key={topic.id}
                href={`/maktaba/${topic.slug}`}
                className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 transition-colors hover:bg-forest-100"
              >
                {topic.order}. {topic.title}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-500">حدد النظام الباب من سياق المادة المسترجعة.</p>
        )}
      </section>

      {/* الكلمات المفتاحية */}
      <section className="space-y-3">
        <SectionTitle icon={KeyRound}>كلمات مفتاحية مقترحة للبحث</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-brass-400/50 bg-brass-100/70 px-3.5 py-1 text-xs font-medium text-brass-600"
            >
              {kw}
            </span>
          ))}
        </div>
      </section>

      <OrnamentDivider />

      {/* المادة المسترجعة */}
      <section className="space-y-4">
        <SectionTitle icon={ScrollText}>المادة المسترجعة من المصادر المعتمدة</SectionTitle>
        <div className="space-y-5">
          {result.passages.map((p, i) => (
            <PassageCard key={p.chunkId} passage={p} index={i} />
          ))}
        </div>
      </section>

      {/* التنظيم الآلي */}
      {result.ai.text && (
        <section className="card-manuscript-deep relative overflow-hidden rounded-2xl p-6 text-parchment-100 shadow-lift sm:p-7">
          <div className="bg-arabesque-dark absolute inset-0" aria-hidden />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SectionTitle icon={Telescope}>
                {result.ai.mode === "model"
                  ? "التنظيم الآلي المستند إلى المادة المسترجعة"
                  : "التنظيم الآلي الحتمي للمادة المسترجعة"}
              </SectionTitle>
              <span className="rounded-full border border-brass-300/50 bg-forest-900/60 px-3 py-0.5 text-[11px] font-medium text-brass-200">
                {result.ai.mode === "model"
                  ? "نموذج ذكاء اصطناعي مقيَّد بالمقاطع أعلاه فقط"
                  : "بدون نموذج ذكاء اصطناعي — تجميع حرفي من المقاطع"}
              </span>
            </div>
            <p className="whitespace-pre-line text-sm leading-8 text-parchment-100/95">
              {result.ai.text}
            </p>
          </div>
        </section>
      )}

      {/* أسئلة بحث ذات صلة */}
      {result.topics.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={CircleHelp}>أسئلة بحث ذات صلة</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {relatedQuestionsOf(result.topics).map((q) => (
              <Link
                key={q}
                href={`/hiwar?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-parchment-300 bg-parchment-50 px-4 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brass-400/60 hover:text-forest-700"
              >
                {q}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* إخلاء المسؤولية */}
      <p className="flex items-start gap-2 rounded-xl border border-brass-400/40 bg-brass-100/50 p-4 text-[13px] leading-7 text-ink-700">
        <Info className="mt-1 size-4 shrink-0 text-brass-500" strokeWidth={2} />
        <span>{result.disclaimer}</span>
      </p>
    </div>
  );
}

/** أسئلة ذات صلة بالأبواب المطابقة: سؤالان من الباب الأول وسؤال من الثاني. */
function relatedQuestionsOf(topics: ResearchResult["topics"]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [i, m] of topics.entries()) {
    const limit = i === 0 ? 2 : 1;
    for (const q of m.topic.relatedQuestions.slice(0, limit)) {
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    }
  }
  return out.slice(0, 4);
}

function AbstainView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise card-manuscript rounded-2xl p-7 text-center sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-brass-400/50 bg-brass-100 text-brass-500">
        <BookOpenText className="size-6" strokeWidth={1.8} />
      </span>
      <h3 className="heading-display mt-5 text-2xl font-bold text-ink-800">لا مادة كافية</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-8 text-ink-600">
        {result.message ?? "لم نجد مادة كافية من المصادر المعتمدة لهذا الموضوع."}
        {" "}لا يستحدث النظام جواباً من خارج المصادر المعتمدة. جرّب إعادة صياغة موضوع
        بحثك بإحدى الكلمات المفتاحية، أو تصفّح أبواب المكتبة المعتمدة.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {result.suggestions.map((s) => (
          <Link
            key={s.slug}
            href={`/maktaba/${s.slug}`}
            className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100"
          >
            {s.title}
          </Link>
        ))}
      </div>
      <OrnamentDivider />
      <p className="mt-4 text-xs text-ink-500">{result.disclaimer}</p>
    </div>
  );
}

function FatwaView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise card-manuscript rounded-2xl p-7 sm:p-9">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-oxblood-700/30 bg-oxblood-100 text-oxblood-700">
          <AlertTriangle className="size-5" strokeWidth={1.9} />
        </span>
        <div>
          <h3 className="heading-display text-2xl font-bold text-ink-800">هذا من مسائل الفتوى</h3>
          <p className="mt-2 max-w-2xl text-sm leading-8 text-ink-600">
            {result.message}
          </p>
          {result.fatwa?.matter && (
            <p className="mt-1 text-xs font-medium text-ink-500">
              صنّف النظام سؤالك ضمن: {result.fatwa.matter}.
            </p>
          )}
        </div>
      </div>

      {result.suggestions.length > 0 && (
        <div className="mt-6 rounded-xl border border-parchment-300 bg-parchment-200/50 p-5">
          <p className="text-sm font-semibold text-ink-700">
            تحويل اختياري إلى مسار بحث علمي في مواضيع التزكية (دون أي حكم شرعي):
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.suggestions.map((s) => (
              <Link
                key={s.slug}
                href={`/maktaba/${s.slug}`}
                className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 border-t border-parchment-300 pt-4 text-xs leading-6 text-ink-500">
        {result.disclaimer}
      </p>
    </div>
  );
}

function SafetyView({ result }: { result: ResearchResult }) {
  const safety = result.safety;
  if (!safety) return null;
  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-oxblood-700/25 bg-parchment-50 shadow-manuscript">
      <div className="bg-oxblood-800 px-7 py-5 text-parchment-50">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-6" strokeWidth={1.8} />
          <h3 className="heading-display text-2xl font-bold">{safety.title}</h3>
        </div>
      </div>
      <div className="space-y-5 p-7 sm:p-8">
        <p className="text-sm leading-8 text-ink-700">{safety.message}</p>
        <ol className="space-y-3">
          {safety.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-7 text-ink-700">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-oxblood-100 text-xs font-bold text-oxblood-700">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 rounded-xl border border-parchment-300 bg-parchment-200/60 p-4 text-[13px] leading-7 text-ink-600">
          <HeartHandshake className="mt-0.5 size-4 shrink-0 text-forest-600" strokeWidth={1.9} />
          بعد اطمئنانك على نفسك، يمكنك العودة والبحث في أبواب مثل{" "}
          <Link href="/maktaba/al-hamm-wal-qalaq" className="link-brass font-semibold">الهم والقلق</Link>
          {" "}لغرض الاطلاع العلمي.
        </p>
      </div>
    </div>
  );
}

/** زر مساعد صغير لعرض حالة الاسترجاع */
export function RetrievalMetaNote({ result }: { result: ResearchResult }) {
  if (result.outcome !== "ok") return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
      <ExternalLink className="size-3" />
      {result.passages.length} مقاطع مسترجعة من مصدر معتمد واحد — حد الاسترجاع الأقصى مطبَّق.
    </p>
  );
}
