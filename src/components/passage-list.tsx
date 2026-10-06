import Link from "next/link";
import { ExternalLink, ListTree } from "lucide-react";
import { PassageCard } from "@/components/passage-card";
import type { RetrievedPassage } from "@/lib/types";

/**
 * عرض مادة المكتبة بحجم معقول.
 *
 * المشكلة التي يعالجها هذا المكوّن: بطاقة المصدر «جامع السنة» كانت تُصيِّر كل
 * مقاطعها الـ397 بنصوصها الكاملة (متن + شرح رسمي) في صفحة ثابتة واحدة، أي
 * 7.4 م.ب من HTML و~54 ألف وسم — ثقلٌ حقيقي على الاتصال المحمول وعلى الرسم
 * الأول، مع أن المحتوى ثابت مسبقاً.
 *
 * الحل: بطاقات كاملة لأول `MAX_FULL_CARDS` مقطعاً، ثم **فهرس مضغوط** لبقية
 * المقاطع يحمل لكل مقطع موضعه ورابطه الرسمي ومساراً إلى الحوار البحثي. لا يُحذف
 * أي مقطع من المكتبة ولا من الاسترجاع؛ يتغيّر حجم ما يُرسم فقط.
 */
export const MAX_FULL_CARDS = 24;

export function PassageList({
  passages,
  maxFullCards = MAX_FULL_CARDS,
}: {
  passages: RetrievedPassage[];
  maxFullCards?: number;
}) {
  const shown = passages.slice(0, maxFullCards);
  const rest = passages.slice(maxFullCards);

  return (
    <>
      {shown.map((passage, index) => (
        <PassageCard key={passage.chunkId} passage={passage} index={index} />
      ))}

      {rest.length > 0 && (
        <details className="rounded-2xl border border-brass-400/30 bg-forest-950/40 p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-brass-200 [&::-webkit-details-marker]:hidden">
            <ListTree className="size-4" strokeWidth={2} />
            فهرس بقية المقاطع — {rest.length} مقطعاً بمواضعها وروابطها الرسمية
          </summary>

          <p className="mt-3 text-xs leading-6 text-parchment-200/70">
            تظهر هنا المواضع والروابط فقط اختصاراً للصفحة؛ النص الكامل لكل مقطع متاح
            بفتحه من أصله الرسمي أو بطلبه في الحوار البحثي. كل هذه المقاطع مستعملة في
            الاسترجاع.
          </p>

          <ul className="mt-4 space-y-2">
            {rest.map((passage) => (
              <li
                key={passage.chunkId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/15 px-3 py-2 text-xs text-parchment-200/80"
              >
                <span className="font-medium">
                  {passage.chapter}
                  {passage.page ? ` — ${passage.page}` : ""}
                </span>
                <span className="flex items-center gap-3">
                  <Link
                    href={`/hiwar?q=${encodeURIComponent(passage.chapter)}`}
                    className="link-brass font-semibold"
                  >
                    استرجاع هذا الموضع
                  </Link>
                  <Link
                    href={passage.source.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-parchment-200/70 hover:text-brass-200"
                  >
                    <ExternalLink className="size-3" />
                    الأصل
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
