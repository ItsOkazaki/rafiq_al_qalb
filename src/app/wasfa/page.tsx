import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Compass, MessagesSquare, OctagonX } from "lucide-react";
import { CornerFrame, OrnamentDivider } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "الوصفة — خدمة متوقفة",
  description: "خدمة الوصفة لم تعد جزءاً من رفيق القلوب. الأداة مساعد بحث علمي لا يقدم وصفات.",
};

export default function WasfaPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-16">
      <CornerFrame>
        <div className="card-manuscript rounded-2xl p-8 text-center sm:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-oxblood-700/30 bg-oxblood-100 text-oxblood-700">
            <OctagonX className="size-7" strokeWidth={1.7} />
          </span>
          <h1 className="heading-display mt-6 text-3xl font-bold text-ink-800 sm:text-4xl">
            «الوصفة» لم تعد جزءاً من الأداة
          </h1>
          <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider /></div>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-9 text-ink-600">
            كان هذا المسار يوحي بتقديم برنامج أو وصفة شخصية — وهذا خارج ولاية المشروع
            تماماً. رفيق القلوب <strong className="text-ink-800">مساعد بحث علمي</strong>:
            يحدد موضوعات البحث، يقترح كلمات مفتاحية، ويسترجع المادة الفعلية من المصادر
            المعتمدة مع مصدرها وموضعها. لا تشخيص، لا فتوى، ولا أي شكل من أشكال الوصف
            العلاجي الشخصي.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/hiwar"
              className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-2.5 text-sm font-bold text-parchment-50 hover:bg-forest-800"
            >
              <MessagesSquare className="size-4" strokeWidth={2} />
              الانتقال إلى الحوار البحثي
            </Link>
            <Link
              href="/hala"
              className="inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-50 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:border-brass-400/60"
            >
              <Compass className="size-4" strokeWidth={2} />
              الاستبانة البحثية
            </Link>
            <Link
              href="/maktaba"
              className="inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-50 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:border-brass-400/60"
            >
              <BookOpenText className="size-4" strokeWidth={2} />
              المكتبة المعتمدة
            </Link>
          </div>
          <p className="mt-8 border-t border-parchment-300 pt-5 text-xs leading-7 text-ink-500">
            إن كنت تبحث عن توجيه شخصي لحالتك، فراجع عالماً موثوقاً أو مختصاً مؤهلاً —
            فالبحث العلمي لا يغني عنهما.
          </p>
        </div>
      </CornerFrame>
    </div>
  );
}
