import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  BookOpenText,
  Compass,
  FileSearch,
  KeyRound,
  Landmark,
  MessagesSquare,
  ScrollText,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { TOPICS } from "@/lib/rag/topics";
import { ACTIVE_SOURCES } from "@/lib/sources/registry";
import { OrnamentDivider, ApprovalStamp } from "@/components/ornaments";

export default function HomePage() {
  return (
    <div>
      {/* ── البطل ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest-900 bg-arabesque-dark text-parchment-100">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 460px at 50% -10%, rgba(201,164,69,0.14), transparent 60%), radial-gradient(700px 380px at 90% 110%, rgba(20,52,34,0.9), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-ornament text-lg text-brass-300">بسم الله نبدأ</p>
            <h1 className="heading-display mt-4 text-5xl font-bold leading-[1.35] text-parchment-50 sm:text-6xl">
              رفيق القلوب
            </h1>
            <OrnamentDivider tone="gold" />
            <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-parchment-200/90 sm:text-lg sm:leading-10">
              مساعد بحث علمي يستقبل وصفك لأي موضوع، فيحدد مسار البحث، ويقترح الكلمات
              المفتاحية، ويسترجع لك المادة الفعلية من المصادر المعتمدة وحدها — مع اسم
              المصدر وموضعه ورابط الأصل — ثم ينظّمها لك تنظيماً علمياً.
              <span className="mt-2 block font-semibold text-brass-200">
                لا يشخّص حالات، ولا يُصدر فتاوى، ولا يصف علاجاً.
              </span>
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/hiwar"
                className="group inline-flex items-center gap-2 rounded-full bg-brass-400 px-7 py-3 text-sm font-bold text-forest-900 shadow-lift transition-all hover:bg-brass-300"
              >
                <MessagesSquare className="size-4.5" strokeWidth={2} />
                ابدأ الحوار البحثي
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
              </Link>
              <Link
                href="/hala"
                className="inline-flex items-center gap-2 rounded-full border border-parchment-100/30 px-7 py-3 text-sm font-semibold text-parchment-100 transition-colors hover:border-brass-300/60 hover:text-brass-200"
              >
                <Compass className="size-4.5" strokeWidth={2} />
                الاستبانة البحثية
              </Link>
            </div>
          </div>

          {/* مقتطف موثق من المادة المعتمدة */}
          <figure className="card-manuscript relative mx-auto mt-14 max-w-3xl rounded-2xl p-7 text-center sm:p-8">
              <blockquote className="passage-text text-ink-800">
                «فقد أثّر هذا الدواء في هذا الداء وأزاله حتى كأن لم يكن، وهو أسهل دواء
                وأيسره؛ ولو أحسن العبد التداوي بالفاتحة لرأى لها تأثيراً عجيباً…»
              </blockquote>
              <figcaption className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-500">
                <span className="font-semibold text-ink-700">الداء والدواء — ابن قيم الجوزية</span>
                <span aria-hidden>•</span>
                <span>الموضع: فصل في التداوي بالفاتحة والقرآن</span>
                <ApprovalStamp />
              </figcaption>
            </figure>
        </div>
      </section>

      {/* ── كيف يعمل ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <header className="text-center">
          <h2 className="heading-display text-3xl font-bold text-forest-800 sm:text-4xl">كيف يعينك على البحث؟</h2>
          <p className="mt-3 text-sm text-ink-500">أربع خطوات مضبوطة — من وصفك إلى المادة الموثقة</p>
          <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider /></div>
        </header>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FileSearch,
              title: "افهم موضوعك",
              desc: "يستقبل النظام وصفك — مثل «أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن» — ويفهمه بوصفه موضوع بحث، لا حالة تحتاج تشخيصاً.",
            },
            {
              icon: Compass,
              title: "مسار وأبواب",
              desc: "يحدد أبواب البحث المناسبة (كقسوة القلب، الغفلة، الخشوع) ويعرضها لك بشفافية كاملة.",
            },
            {
              icon: BookOpenText,
              title: "استرجاع مضبوط",
              desc: "يبحث في المادة المعتمدة فقط، ويسترجع المقاطع الفعلية — لا روابط مجردة — مع اسم المصدر والموضع داخله.",
            },
            {
              icon: SlidersHorizontal,
              title: "تنظيم مستند",
              desc: "ينظّم المسترجَع تنظيماً علمياً: تلخيص مقيَّد بالمقاطع نفسها، ويمتنع صراحة حين لا تكفي المادة المعتمدة.",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="card-manuscript group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl border border-brass-400/50 bg-brass-100 text-forest-700">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="font-ornament text-2xl text-brass-400/70">{["١", "٢", "٣", "٤"][i]}</span>
              </div>
              <h3 className="heading-display mt-4 text-xl font-bold text-ink-800">{title}</h3>
              <p className="mt-2 text-[13px] leading-7 text-ink-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── حدود الأداة ────────────────────────────────────────── */}
      <section className="border-y border-parchment-300 bg-parchment-200/60">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="heading-display text-3xl font-bold text-forest-800">حدود واضحة لا تُتجاوز</h2>
              <p className="mt-4 text-sm leading-8 text-ink-600">
                صُمم رفيق القلوب ليكون أداة بحث أمينة محدودة السلطة. الدقة أولى من الكم:
                إن تعذّر توثيق مادة فلا تُستخدم، وإن فشل الاسترجاع فلا يُخترع جواب، وإن
                كان السؤال فتوى فالإحالة إلى أهل العلم، وإن كان هناك خطر على السلامة
                يتوقف المحتوى المعتاد فوراً.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/maktaba" className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-forest-800">
                  <Landmark className="size-4" strokeWidth={2} />
                  سجل المصادر المعتمدة
                </Link>
                <Link href="/wasfa" className="link-brass mt-2.5 text-sm font-medium">
                  ماذا عن صفحة «الوصفة»؟
                </Link>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Ban, title: "لا تشخيص", desc: "لا يصف حالتك ولا يسمّي داءً فيك." },
                { icon: ShieldAlert, title: "لا فتوى", desc: "أسئلة الحلال والحرام تُحال إلى عالِم مؤهل." },
                { icon: ScrollText, title: "لا وصفات", desc: "لا برامج علاجية ولا خططاً شخصية." },
                { icon: BadgeCheck, title: "امتناع أمين", desc: "«لم نجد مادة كافية» خير من جواب غير موثق." },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3 rounded-xl border border-parchment-300 bg-parchment-50 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-700">
                    <Icon className="size-4.5" strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink-800">{title}</span>
                    <span className="mt-0.5 block text-xs leading-6 text-ink-500">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── مسارات البحث ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="heading-display text-3xl font-bold text-forest-800">أبواب البحث الاثنا عشر</h2>
            <p className="mt-2 text-sm text-ink-500">تصنيف موحّد مرتب — لكل باب صفحة تعرض مادته المسترجعة من المصدر المعتمد</p>
          </div>
          <Link href="/maktaba" className="link-brass flex items-center gap-1 text-sm font-semibold">
            المكتبة كاملة <ArrowLeft className="size-4" strokeWidth={2} />
          </Link>
        </header>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((t) => (
            <Link
              key={t.id}
              href={`/maktaba/${t.slug}`}
              className="card-manuscript group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-brass-400/60 hover:shadow-lift"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-brass-400/50 bg-brass-100 font-ornament text-sm font-bold text-brass-600">
                {t.order}
              </span>
              <h3 className="heading-display mt-4 text-lg font-bold leading-8 text-ink-800 group-hover:text-forest-700">
                {t.title}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-6 text-ink-500">{t.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brass-500">
                <KeyRound className="size-3" strokeWidth={2} />
                {t.keywords.slice(0, 2).join(" · ")}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── المصادر المعتمدة ────────────────────────────────────── */}
      <section className="bg-forest-900 bg-arabesque-dark py-20 text-parchment-100">
        <div className="mx-auto max-w-6xl px-5">
          <header className="text-center">
            <h2 className="heading-display text-3xl font-bold text-parchment-50">المصادر الفعّالة في الاسترجاع</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-parchment-200/80">
              لا يظهر هنا إلا مصدر موثّق ومفهرس تُسترجع منه مقاطع فعلية. الاسترجاع لا
              يتجاوز هذه المصادر، والكتب غير المعتمدة لا تظهر في المكتبة ولا يُسترجع منها.
            </p>
            <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider tone="gold" /></div>
          </header>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            {ACTIVE_SOURCES.map((s) => (
              <Link
                key={s.id}
                href={`/maktaba/kutub/${s.slug}`}
                className="card-manuscript-deep group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-brass-300/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <ApprovalStamp />
                  <span className="text-[11px] text-parchment-200/60">{s.category}</span>
                </div>
                <h3 className="heading-display mt-4 text-xl font-bold leading-9 text-parchment-50 group-hover:text-brass-200">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs text-parchment-200/75">{s.author}</p>
                <p className="mt-3 text-xs leading-6 text-parchment-200/70">{s.publisher}</p>
                <p className="mt-4 flex items-center gap-1.5 border-t border-parchment-50/10 pt-3 text-[11px] text-parchment-200/60">
                  <BadgeCheck className="size-3.5 text-brass-300" strokeWidth={2} />
                  الاسترجاع منه مفعّل بعد فحص الموضع والمصدر
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
