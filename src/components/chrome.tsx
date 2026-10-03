import Link from "next/link";
import Image from "next/image";
import { BookOpenText, HeartPulse, Landmark, MessagesSquare } from "lucide-react";
import { OrnamentDivider } from "@/components/ornaments";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Landmark },
  { href: "/hiwar", label: "الحوار البحثي", icon: MessagesSquare },
  { href: "/hala", label: "لمحة بحثية", icon: HeartPulse },
  { href: "/maktaba", label: "المكتبة المعتمدة", icon: BookOpenText },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-dark border-b border-white/8 px-5 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <Link href="/" className="group flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo/Sub/white-gold.svg"
              alt="شعار رفيق القلوب"
              width={597}
              height={528}
              className="h-11 w-[56px] shrink-0 rounded-none border-0 bg-transparent object-contain p-0 shadow-none sm:h-12 sm:w-[60px]"
              priority
            />
            <span className="hidden leading-tight sm:block">
              <span className="block max-w-[235px] text-[10.5px] font-medium leading-5 tracking-wide text-brass-300/80">
                أداة حوارية — مادة مفهرسة موثقة المصدر والصفحة
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-parchment-200/80 transition-all hover:bg-white/8 hover:text-brass-300"
              >
                <Icon className="size-4 opacity-70" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="/hiwar"
            className="hidden rounded-full bg-gradient-to-l from-brass-600 to-brass-400 px-5 py-2 text-sm font-bold text-forest-900 shadow-lg transition-all hover:from-brass-500 hover:to-brass-300 hover:shadow-brass-400/20 md:inline-block"
          >
            ابدأ الحوار البحثي
          </Link>
        </div>
      </div>
      <nav className="flex items-center justify-center gap-1 border-b border-white/6 bg-black/20 px-3 py-1.5 backdrop-blur-md md:hidden">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-parchment-200/70 hover:text-brass-300"
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
    <footer className="mt-24 border-t border-white/8">
      <div className="glass-dark relative overflow-hidden px-5 py-14">
        <div className="pointer-events-none absolute bottom-0 right-0 hidden w-36 translate-x-6 translate-y-5 opacity-[0.10] lg:block" aria-hidden>
          <Image
            src="/logo/marks/white-gold.svg"
            alt=""
            width={170}
            height={95}
            className="h-auto w-full"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl">
          <OrnamentDivider tone="gold" />
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <div>
              <p className="heading-display text-2xl font-bold text-parchment-50">رفيق القلوب</p>
              <p className="mt-3 text-sm leading-7 text-parchment-200/70">
                أداة حوارية للخطباء والوعاظ والمختصين وطلاب العلم. تسترجع المادة حصراً من مصادر
                مفهرسة مسبقاً مع المصدر والموضع والرابط الأصلي.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold tracking-wide text-brass-300">حدود الأداة</p>
              <ul className="space-y-2 text-sm text-parchment-200/70">
                <li>لا تقدّم تشخيصاً لأي حالة.</li>
                <li>لا تُصدر فتوى ولا حكماً شرعياً.</li>
                <li>لا تصف علاجاً أو برنامجاً شخصياً.</li>
                <li>تمتنع صراحة عند غياب المادة.</li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold tracking-wide text-brass-300">سياسة المصادر</p>
              <p className="text-sm leading-7 text-parchment-200/70">
                الاسترجاع مقصور على{" "}
                <Link href="/maktaba" className="link-brass">المصادر المسجلة في المكتبة</Link>.
                لا تُعرض الكتب غير المعتمدة ولا يُسترجع منها.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/6 pt-6 text-center text-xs text-parchment-200/40">
            <p>هذه مادة للبحث والدراسة، وليست تشخيصاً ولا فتوى ولا وصفاً لعلاج شخصي.</p>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/lab" className="link-brass">مختبر الأدلة (للجنة)</Link>
              <Link href="/wasfa" className="link-brass">سياسة عدم الوصف</Link>
            </p>
            <p>رفيق القلوب — مشروع بحثي لتحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
