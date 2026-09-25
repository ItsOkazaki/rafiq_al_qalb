import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Compass, MessagesSquare, OctagonX } from "lucide-react";
import { OrnamentDivider } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "سياسة عدم الوصف",
  description:
    "رفيق القلوب أداة بحث علمي؛ لا توفر وصفة ولا برنامجاً ولا علاجاً شخصياً.",
};

const RETIRED_FEATURES = [
  "لا ينشئ النظام وصفة روحية أو شخصية.",
  "لا يحدد برنامج علاج أو خطة مشروطة بحالة.",
  "لا يجمع إجابات لتوليد توجيه شخصي.",
  "لا يحول سؤالك إلى سياق التزكية إلا إذا أردت البحث أنت صراحة.",
  "لا يخزن صفحة وصفة ولا يعرضها في التنقل العام.",
];

export default function WasfaPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-16">
      <div className="card-manuscript rounded-2xl p-8 sm:p-12">
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full border border-oxblood-700/30 bg-oxblood-100 text-oxblood-700">
              <OctagonX className="size-7" strokeWidth={1.7} />
            </span>
            <h1 className="heading-display mt-6 text-3xl font-bold text-ink-800 sm:text-4xl">
              سياسة عدم الوصف العلاجي
            </h1>
            <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider /></div>
          </div>

          <div className="mt-8 rounded-xl border border-parchment-300 bg-parchment-200/50 p-5 text-[13px] leading-8 text-ink-600">
            رفيق القلوب أداة بحث علمي محض، تهدف للمساعدة في الوصول إلى مادة علمية موثقة من المصادر المعتمدة. 
            التزاماً بالأمانة العلمية والشرعية، فإن الأداة لا تقدم أي وصفات علاجية، برامج شخصية، أو خطط "روحية". 
            نحن نؤمن أن التوجيه الشخصي والفتوى هما ولاية العلماء والمختصين المؤهلين حصراً.
          </div>

          <div className="mt-8">
            <p className="mb-4 text-sm font-bold text-ink-700">ما الذي تضمنه حذف الوظيفة؟</p>
            <ul className="space-y-3">
              {RETIRED_FEATURES.map((item, index) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-7 text-ink-600">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-oxblood-700/30 bg-oxblood-100 text-[11px] font-bold text-oxblood-700">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 text-center">
            <p className="mb-4 text-sm font-bold text-ink-700">مساراتك المتاحة فقط</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/hiwar"
                className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-2.5 text-sm font-bold text-parchment-50 hover:bg-forest-800"
              >
                <MessagesSquare className="size-4" strokeWidth={2} />
                الحوار البحثي
              </Link>
              <Link
                href="/hala"
                className="inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-50 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:border-brass-400/60"
              >
                <Compass className="size-4" strokeWidth={2} />
                استبانة البحث
              </Link>
              <Link
                href="/maktaba"
                className="inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-50 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:border-brass-400/60"
              >
                <BookOpenText className="size-4" strokeWidth={2} />
                المكتبة المعتمدة
              </Link>
            </div>
          </div>

          <p className="mt-8 border-t border-parchment-300 pt-5 text-center text-xs leading-7 text-ink-500">
            إن كنت تبحث عن توجيه شخصي لحالتك، راجع عالماً موثوقاً أو مختصاً مؤهلاً —
            فالبحث العلمي لا يغني عنهما.
          </p>
        </div>
    </div>
  );
}
