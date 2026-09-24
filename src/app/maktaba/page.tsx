import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BookMarked, ExternalLink, Library, ShieldCheck } from "lucide-react";
import { ACTIVE_SOURCES } from "@/lib/sources/registry";
import { TOPICS } from "@/lib/rag/topics";
import { getChunksByTopic, getChunksBySource } from "@/lib/corpus/chunks";
import { ApprovalStamp, OrnamentDivider } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "المكتبة المعتمدة",
  description:
    "المصادر المعتمدة الفعّالة في رفيق القلوب وأبواب البحث المفهرسة. الكتب غير المعتمدة لا تظهر هنا ولا يُسترجع منها.",
};

export default function MaktabaPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12">
      <header className="text-center">
        <h1 className="heading-display text-4xl font-bold text-forest-800">المكتبة المعتمدة</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          كل ما يظهر في هذه الصفحة مسجّل في سجل المصادر المعتمدة. الكتب غير المعتمدة —
          وأي بيانات قديمة لغير المسجل — لا تُعرض ولا يُسترجع منها إطلاقاً.
        </p>
        <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider /></div>
      </header>

      {/* سياسة الاعتماد */}
      <section className="card-manuscript mx-auto mt-10 max-w-4xl rounded-2xl p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-sm font-bold text-forest-700">
            <ShieldCheck className="size-4.5" strokeWidth={2} />
            سياسة اعتماد المصادر
          </h2>
          <ul className="mt-3 grid gap-2 text-[13px] leading-7 text-ink-600 sm:grid-cols-2">
            <li className="flex gap-2"><BadgeCheck className="mt-1 size-4 shrink-0 text-brass-500" /> تسجيل صريح في السجل قبل أي استرجاع.</li>
            <li className="flex gap-2"><BadgeCheck className="mt-1 size-4 shrink-0 text-brass-500" /> ارتباط بجهة رسمية أو موثوقة يمكن الرجوع إليها.</li>
            <li className="flex gap-2"><BadgeCheck className="mt-1 size-4 shrink-0 text-brass-500" /> وفهرسة على مستوى المواضع — لا أرقام صفحات بلا تحقق.</li>
            <li className="flex gap-2"><BadgeCheck className="mt-1 size-4 shrink-0 text-brass-500" /> ظاهر للمستخدم دائماً: الاسم، الموضع، ورابط الأصل.</li>
          </ul>
        </section>

      {/* سجل المصادر */}
      <section className="mt-14">
        <h2 className="heading-display flex items-center gap-2 text-2xl font-bold text-forest-800">
          <Library className="size-5.5" strokeWidth={1.8} />
          سجل المصادر
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {ACTIVE_SOURCES.map((s) => {
            const count = getChunksBySource(s.id).length;
            return (
              <div key={s.id} className="card-manuscript flex flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ApprovalStamp />
                  <span className="text-[11px] text-ink-500">{s.category}</span>
                </div>
                <h3 className="heading-display mt-3 text-xl font-bold leading-9 text-ink-800">{s.title}</h3>
                <p className="mt-1 text-xs text-ink-500">{s.author}</p>
                <dl className="mt-4 space-y-1.5 rounded-xl border border-parchment-300 bg-parchment-200/50 p-4 text-xs leading-6 text-ink-600">
                  <div className="flex gap-2"><dt className="font-semibold text-ink-700">الناشر المعتمد:</dt><dd>{s.publisher}</dd></div>
                  <div className="flex gap-2"><dt className="font-semibold text-ink-700">المقاطع المفهرسة:</dt><dd>{count} مقطعاً مستخدماً في الاسترجاع</dd></div>
                </dl>
                <p className="mt-3 text-[11px] leading-6 text-ink-500">{s.notes}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-parchment-300 pt-4">
                  <Link href={`/maktaba/kutub/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-parchment-50 hover:bg-forest-800">
                    <BookMarked className="size-3.5" />
                    بطاقة المصدر
                  </Link>
                  <Link href={s.originalUrl} target="_blank" rel="noopener noreferrer" className="link-brass inline-flex items-center gap-1 text-xs font-semibold">
                    فتح الأصل <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* أبواب البحث — التصنيف الاثني عشر */}
      <section className="mt-16">
        <h2 className="heading-display text-2xl font-bold text-forest-800">أبواب البحث — التصنيف الاثني عشر</h2>
        <p className="mt-2 text-sm text-ink-500">
          تصنيف موحّد بلا تكرار ولا تداخل؛ كل باب صفحة تعرض مادته المسترجعة من المصدر المعتمد
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => (
            <Link
              key={t.id}
              href={`/maktaba/${t.slug}`}
              className="card-manuscript group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-brass-400/60 hover:shadow-lift"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full border border-brass-400/50 bg-brass-100 font-ornament text-sm font-bold text-brass-600">
                  {t.order}
                </span>
                <span className="rounded-full border border-brass-400/40 bg-brass-100 px-2.5 py-0.5 text-[10px] font-bold text-brass-600">
                  {getChunksByTopic(t.id).length} مقاطع
                </span>
              </div>
              <h3 className="heading-display mt-4 text-lg font-bold leading-8 text-ink-800 group-hover:text-forest-700">{t.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-6 text-ink-500">{t.description}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-6 text-ink-500">{t.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
