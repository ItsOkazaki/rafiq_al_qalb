import Link from "next/link";
import { BookMarked, ExternalLink, FileText, Tag } from "lucide-react";
import { Fragment } from "react";
import type { RetrievedPassage } from "@/lib/types";

export function PassageCard({ passage, index }: { passage: RetrievedPassage; index?: number }) {
  const isLiteral = passage.excerptType === "literal";
  const isIndex = passage.role === "index";
  return (
    <article className="card-manuscript relative overflow-hidden rounded-2xl p-6 text-parchment-100 sm:p-7">
      {/* Gold left bar */}
      <div
        className="absolute inset-y-0 right-0 w-1"
        style={{ background: "linear-gradient(to bottom, rgba(201,164,69,0.7), rgba(201,164,69,0.2), rgba(44,92,67,0.5))" }}
        aria-hidden
      />

      {/* Excerpt type badge */}
      <header className="flex flex-wrap items-center gap-3 mb-5">
        {typeof index === "number" && (
          <span className="grid size-8 place-items-center rounded-full glass-gold text-sm font-bold text-brass-300">
            {index + 1}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${
          isLiteral
            ? "bg-forest-700/40 border border-forest-400/25 text-forest-200"
            : "bg-brass-400/10 border border-brass-400/25 text-brass-300"
        }`}>
          <FileText className="size-3" strokeWidth={2} />
          {isIndex ? "مدخل فهرسة موضوعية من الجامع" : isLiteral ? "نص موثق من الأصل" : "عرض بحثي موجّه للموضع"}
        </span>
        <span className="ms-auto text-[11px] font-medium text-parchment-200/65">
          {passage.chapter}{passage.page ? ` — ${passage.page}` : ""}
        </span>
      </header>

      {/* Quran text, when explicitly verified and supplied separately from tafsir */}
      {passage.quranText && (
        <section className="mb-5 rounded-xl border border-brass-400/30 bg-forest-950/45 px-5 py-5 shadow-inner" aria-label="النص القرآني الموثق" data-quran-riwaya="hafs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-brass-300/35 bg-brass-400/10 px-3 py-1 text-[10px] font-bold text-brass-200">
              نص قرآني موثّق — رواية حفص عن عاصم
            </span>
            {passage.quranReference && (
              <span className="text-[11px] font-medium text-parchment-200/70">{passage.quranReference}</span>
            )}
          </div>
          <p className="quran-text mt-4 text-[1.38rem] leading-[2.45] text-parchment-50" dir="rtl" lang="ar" translate="no">
            {passage.quranText}
          </p>
          <p className="mt-3 text-[10px] leading-5 text-parchment-200/55">
            عُرض النص القرآني بخط الرسم العثماني (حفص). مصدر النص المذكور في هذه البطاقة هو مشروع المصحف الإلكتروني بجامعة الملك سعود؛ أما الملخّص الآلي فطبقة منفصلة ولا يُنسب إلى المصدر.
          </p>
        </section>
      )}

      {/* Main source text */}
      <p className="passage-text text-parchment-100/90 leading-relaxed">{renderPassageText(passage.text, { hideMarkedQuran: Boolean(passage.quranText) })}</p>
      {isIndex && (
        <p className="mt-3 rounded-lg border border-brass-400/20 bg-brass-400/5 px-3 py-2 text-[10px] leading-5 text-parchment-200/65">هذا مدخل فهرسة موضوعية مأخوذ من نتائج جامع السنة الرسمي، وليس نص الحديث الكامل. افتح الأصل للتحقق من المتن والموضع.</p>
      )}

      {/* Source metadata */}
      <div className="mt-6 space-y-4 rounded-xl glass p-5">
        <dl className="grid gap-3 text-[13px] leading-6 text-parchment-200/70 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <BookMarked className="mt-1 size-4 shrink-0 text-brass-400" strokeWidth={1.8} />
            <div>
              <dt className="font-semibold text-parchment-100/90">المصدر</dt>
              <dd>{passage.source.title}</dd>
              <dd className="text-[11px] text-parchment-200/65">{passage.source.author}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <BookMarked className="mt-1 size-4 shrink-0 text-brass-400 opacity-0" strokeWidth={1.8} />
            <div>
              <dt className="font-semibold text-parchment-100/90">الناشر</dt>
              <dd>{passage.source.publisher}</dd>
            </div>
          </div>
        </dl>

        {passage.keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-4">
            <Tag className="size-3.5 text-brass-400/60" strokeWidth={2} />
            {passage.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-white/6 border border-white/10 px-2.5 py-0.5 text-[11px] text-parchment-200/70">
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
          <Link
            href={passage.source.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-brass-600 to-brass-400 px-4 py-1.5 text-xs font-bold text-forest-900 transition-opacity hover:opacity-85"
          >
            <ExternalLink className="size-3.5" strokeWidth={2} />
            فتح المصدر الأصلي
          </Link>
          {passage.source.verificationUrl && (
            <Link
              href={passage.source.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-brass text-xs font-medium"
            >
              <ExternalLink className="inline size-3 me-1" strokeWidth={2} />
              {passage.source.verificationLabel ?? "فتح النسخة الرسمية للتحقق"}
            </Link>
          )}
          <Link href={`/maktaba/kutub/${passage.source.slug}`} className="link-brass text-xs font-medium">
            بطاقة المصدر
          </Link>
        </div>
      </div>
    </article>
  );
}


function renderPassageText(text: string, options: { hideMarkedQuran?: boolean } = {}) {
  const parts = text.split(/(﴿[^﴾]+﴾)/g);
  return parts.map((part, index) =>
    /^﴿[^﴾]+﴾$/.test(part)
      ? options.hideMarkedQuran
        ? null
        : <span key={index} className="quran-inline" dir="rtl" lang="ar" translate="no">{part}</span>
      : <Fragment key={index}>{part}</Fragment>,
  );
}
