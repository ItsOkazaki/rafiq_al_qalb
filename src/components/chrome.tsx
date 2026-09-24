import Link from "next/link";
import { BookOpenText, HeartPulse, Landmark, MessagesSquare } from "lucide-react";
import { OrnamentDivider } from "@/components/ornaments";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Landmark },
  { href: "/hiwar", label: "الحوار البحثي", icon: MessagesSquare },
  { href: "/hala", label: "الاستبانة البحثية", icon: HeartPulse },
  { href: "/maktaba", label: "المكتبة المعتمدة", icon: BookOpenText },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-parchment-300/80 bg-parchment-100/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-full border border-brass-400/60 bg-forest-800 text-brass-200 shadow-[inset_0_0_0_1px_rgba(231,213,168,0.25)]"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12 3l2.1 4.9 5.4.4-4.1 3.5 1.3 5.3L12 14.3 7.3 17l1.3-5.3-4.1-3.5 5.4-.4L12 3z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="heading-display block text-xl font-bold text-forest-800">رفيق القلوب</span>
            <span className="block text-[11px] font-medium tracking-wide text-ink-500">
              مساعد بحث علمي — مادة موثقة من مصادر معتمدة
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-200/70 hover:text-forest-700"
            >
              <Icon className="size-4" strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/hiwar"
          className="hidden rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-parchment-50 shadow-manuscript transition-colors hover:bg-forest-800 md:inline-block"
        >
          ابدأ البحث
        </Link>
      </div>
      <nav className="flex items-center justify-center gap-1 overflow-x-auto border-t border-parchment-200 px-3 py-1.5 md:hidden">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-parchment-200/70"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-forest-800/15 bg-forest-900 bg-arabesque-dark text-parchment-200">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <OrnamentDivider tone="gold" />
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div>
            <p className="heading-display text-2xl font-bold text-parchment-50">رفيق القلوب</p>
            <p className="mt-3 text-sm leading-7 text-parchment-200/85">
              مساعد بحث علمي يساعد على تحديد أبواب البحث، واقتراح الكلمات المفتاحية،
              واسترجاع المادة من المصادر المعتمدة فحسب — مع عرض المصدر والموضع ورابط الأصل.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-brass-200">حدود الأداة</p>
            <ul className="space-y-2 text-sm text-parchment-200/85">
              <li>لا تقدّم تشخيصاً لأي حالة.</li>
              <li>لا تُصدر فتوى ولا حكماً شرعياً.</li>
              <li>لا تقترح علاجاً شخصياً ولا وصفات.</li>
              <li>تمتنع عن الإجابة إن غابت المادة المعتمدة.</li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-brass-200">سياسة المصادر</p>
            <p className="text-sm leading-7 text-parchment-200/85">
              الاسترجاع مقصور على المصادر المسجلة في{" "}
              <Link href="/maktaba" className="link-brass">المكتبة المعتمدة</Link>.
              لا تُضاف مادة إلا بعد تسجيل المصدر وتوثيق موضعه، ولا تُعرض الكتب غير المعتمدة في المكتبة.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-2 border-t border-parchment-50/10 pt-6 text-center text-xs text-parchment-200/60">
          <p>هذه مادة للبحث والدراسة، وليست تشخيصاً ولا فتوى ولا وصفاً لعلاج شخصي.</p>
          <p>رفيق القلوب — مشروع بحثي للمختصين والدعاة وطالبي العلم.</p>
        </div>
      </div>
    </footer>
  );
}
