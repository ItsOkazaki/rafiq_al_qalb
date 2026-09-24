import Link from "next/link";
import { BookMarked, ExternalLink, Landmark, Tag } from "lucide-react";
import type { RetrievedPassage } from "@/lib/types";
import { ApprovalStamp } from "@/components/ornaments";

/**
 * بطاقة مقطع مسترجع: النص الفعلي من المصدر المعتمد + بيانات المصدر والموضع
 * + رابط فتح الأصل. هذه هي وحدة العرض الأساسية في النظام كله.
 */
export function PassageCard({ passage, index }: { passage: RetrievedPassage; index?: number }) {
  return (
    <article className="card-manuscript relative overflow-hidden rounded-2xl p-6 sm:p-7">
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-brass-400/70 via-brass-300/50 to-forest-600/50" aria-hidden />
      <header className="flex flex-wrap items-center gap-3">
        {typeof index === "number" && (
          <span className="grid size-8 place-items-center rounded-full border border-brass-400/60 bg-brass-100 heading-display text-sm font-bold text-brass-600">
            {index + 1}
          </span>
        )}
        <ApprovalStamp />
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
          passage.excerptType === "literal"
            ? "border-forest-600/40 bg-forest-50 text-forest-700"
            : "border-brass-400/50 bg-brass-100/70 text-brass-600"
        }`}>
          {passage.excerptType === "literal" ? "نص موثق من الأصل" : "عرض بحثي موجّه للموضع"}
        </span>
        <span className="ms-auto text-[11px] font-medium text-ink-500">
          {passage.chapter}{passage.page ? ` — ${passage.page}` : ""}
        </span>
      </header>

      <p className="passage-text mt-4 text-ink-800">{passage.text}</p>

      <div className="mt-5 space-y-3 rounded-xl border border-parchment-300 bg-parchment-200/50 p-4">
        <dl className="grid gap-2 text-[13px] leading-6 text-ink-600 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <BookMarked className="mt-1 size-4 shrink-0 text-forest-600" strokeWidth={1.8} />
            <div>
              <dt className="font-semibold text-ink-700">المصدر</dt>
              <dd>{passage.source.title} — {passage.source.author}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Landmark className="mt-1 size-4 shrink-0 text-forest-600" strokeWidth={1.8} />
            <div>
              <dt className="font-semibold text-ink-700">الناشر المعتمد</dt>
              <dd>{passage.source.publisher}</dd>
            </div>
          </div>
        </dl>

        {passage.keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-parchment-300/70 pt-3">
            <Tag className="size-3.5 text-brass-500" strokeWidth={2} />
            {passage.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-parchment-300 bg-parchment-50 px-2.5 py-0.5 text-[11px] text-ink-600"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Link
            href={passage.source.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-parchment-50 transition-colors hover:bg-forest-800"
          >
            <ExternalLink className="size-3.5" strokeWidth={2} />
            فتح المصدر الأصلي
          </Link>
          {passage.source.verificationUrl && (
            <Link
              href={passage.source.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-brass inline-flex items-center gap-1 text-xs font-medium"
            >
              <ExternalLink className="size-3" strokeWidth={2} />
              {passage.source.verificationLabel ?? "فتح النسخة الرسمية للتحقق"}
            </Link>
          )}
          <Link href={`/maktaba/kutub/${passage.source.slug}`} className="link-brass text-xs font-medium">
            بطاقة المصدر في المكتبة
          </Link>
        </div>
      </div>
    </article>
  );
}
