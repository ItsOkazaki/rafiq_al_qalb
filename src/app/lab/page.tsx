import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BookOpenText, CheckCircle2, GitCompareArrows, Search, ShieldCheck } from "lucide-react";
import { OrnamentDivider } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "مختبر الأدلة",
  description:
    "شرح قابل للمراجعة لمسار الاسترجاع المضبوط وحدود التوليد والقياس المقارن في رفيق القلوب.",
};

const stages = [
  ["01", "Policy Gates", "قبل أي استرجاع: فحص السلامة، ثم منع التشخيص، ثم منع الفتوى، ثم منع الوصف العلاجي، ثم منع طلب صفحة غير مفهرسة."],
  ["02", "Arabic Normalization", "تطبيع عربي محلي للعامية والتشكيل والصيغ، مع تجزئة الكلمات واستخراج جذور البحث."],
  ["03", "Topic + Keyword Analysis", "تحديد الأبواب البحثية الاثني عشر والكلمات المفتاحية من وصف المستخدم نفسه."],
  ["04", "Approved-Corpus Retrieval", "استرجاع لفظي/موضوعي من سجل المصادر المعتمدة فقط، بعتبة صلة وحد أقصى أربعة مقاطع، وحصر قرآني خاص عند سؤال التفسير."],
  ["05", "Evidence Gate", "إن لم تكفِ المادة → امتناع صريح. لا جواب بلا مقطع معتمد، ولا مصادر خارج السجل."],
  ["06", "Grounded Organization", "نموذج مقيَّد (Gemini/OpenAI) يعيد تنظيم المقاطع المسترجعة بنص عربي فقط، وحارس لاحق يرفض أي صياغة محظورة أو مخرجات مختلطة، وإلا فالتنظيم الحتمي من المقاطع نفسها."],
];

const metrics = [
  ["Outcome Accuracy", "هل طابق ناتج المسار (مادة / امتناع / إحالة فتوى / رد سلامة) المتوقع في الـgold set؟"],
  ["Retrieval Hit@4", "هل ظهر مصدر متوقع ضمن المقاطع الأربعة النهائية؟"],
  ["Chunk Recall", "نسبة المقاطع الذهبية التي وصلت إلى النتيجة النهائية، وهي أدق من قياس اسم المصدر."],
  ["Abstention Accuracy", "هل امتنع النظام في الحالات التي لا يوجد فيها دليل كافٍ أو التي تتطلب إحالة؟"],
  ["Organization Mode", "هل نظّم النموذج المادة فعلاً، أم عمل المسار الحتمي؟ يُقاس لكل حالة على البيئة المنشورة."],
];

export default function LabPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brass-600">Evidence Lab</p>
        <h1 className="heading-display mt-3 text-4xl font-bold text-parchment-50 sm:text-5xl">مختبر الأدلة</h1>
        <p className="mt-4 text-sm leading-8 text-parchment-200/75">
          هذه الصفحة مصممة للجنة التحكيم والفريق: ماذا يفعل AI فعلاً، كيف نمنعه من تجاوز الدليل، وكيف نقيس القيمة المضافة مقابل baseline.
        </p>
      </header>

      <section className="mt-10 overflow-hidden rounded-3xl border border-forest-800/20 bg-forest-900 bg-arabesque-dark p-7 text-parchment-50 shadow-lift sm:p-9">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brass-300/30 bg-forest-800 px-3 py-1 text-[11px] font-bold text-brass-200">EVIDENCE-FIRST</span>
              <span className="text-[11px] text-parchment-200/65">Evidence before generation</span>
            </div>
            <h2 className="heading-display mt-3 text-3xl font-bold">الدليل أولاً، والنموذج في النهاية وبحدود صارمة</h2>
            <p className="mt-4 text-sm leading-8 text-parchment-200/85">
              المسار كله حتمي وقابل للمراجعة: السياسات، ثم تطبيع عربي محلي، ثم تحديد الأبواب، ثم استرجاع
              من سجل المصادر المعتمدة فقط. النموذج لا يبحث ولا يقرر، ولا يُستدعى إلا لتنظيم المقاطع
              المسترجعة نصاً عربياً، ويمرّ بعده حارس يرفض أي خارج عن المادة المسترجعة. وبدون مفتاح مزوّد
              يعمل المسار بالكامل عبر التنظيم الحتمي من المقاطع نفسها.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stages.slice(0, 4).map(([n, title, desc]) => (
              <div key={n} className="rounded-2xl border border-parchment-50/10 bg-forest-800/65 p-4">
                <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-brass-200/60">{n}</span><span className="text-sm font-bold">{title}</span></div>
                <p className="mt-2 text-[11px] leading-5 text-parchment-200/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brass-600">Pipeline</p><h2 className="heading-display mt-1 text-2xl font-bold text-parchment-50">ماذا يحدث قبل أن ترى الإجابة؟</h2></div><Link href="/hiwar" className="link-brass text-xs font-semibold">جرّب المسار الآن</Link></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stages.map(([n, title, desc]) => (
            <article key={n} className="card-manuscript rounded-2xl p-5">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-brass-600">{n}</span><BadgeCheck className="size-4 text-brass-300" /></div>
              <h3 className="heading-display mt-4 text-lg font-bold text-parchment-50">{title}</h3>
              <p className="mt-2 text-[12px] leading-6 text-parchment-200/75">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <OrnamentDivider />

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brass-600">Evaluation</p><h2 className="heading-display mt-1 text-2xl font-bold text-parchment-50">مؤشرات القياس</h2></div><span className="text-[11px] text-parchment-200/70">نفس الأسئلة · مساران · مقارنة عادلة</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([title, desc]) => (
            <div key={title} className="card-manuscript rounded-2xl p-5"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-brass-300" /><h3 className="text-sm font-bold text-parchment-50">{title}</h3></div><p className="mt-2 text-xs leading-6 text-parchment-200/75">{desc}</p></div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="card-manuscript rounded-2xl p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-parchment-50"><GitCompareArrows className="size-4 text-brass-300" />Baseline vs AI</div>
          <p className="mt-2 text-xs leading-6 text-parchment-200/75">Benchmark runner يعيد نفس السؤال مرتين: lexical baseline، ثم المسار AI. لا نحسب «الفوز» من الانطباع؛ نحتفظ بالـground-truth ونكتب النتيجة إلى ملف قابل للمراجعة.</p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink-900 p-4 text-left text-[10px] leading-5 text-parchment-100">{`npm run benchmark\n# → benchmarks/results/latest.json`}</pre>
        </div>
        <div className="card-manuscript rounded-2xl p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-parchment-50"><ShieldCheck className="size-4 text-brass-300" />الحقوق والخصوصية</div>
          <p className="mt-2 text-xs leading-6 text-parchment-200/75">الـbenchmark ثابت ومصطنع/محدد مسبقاً. لا تُرفع محادثات مستخدمين حقيقية، ولا توجد مفاتيح سرية في المستودع. ملفات المصدر توضح حالة الترخيص وطريقة الاستخدام.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs"><Link href="/maktaba" className="inline-flex items-center gap-1 rounded-full border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-ink-600"><BookOpenText className="size-3.5" />سجل المصادر</Link><a href="/hiwar" className="inline-flex items-center gap-1 rounded-full border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-ink-600"><Search className="size-3.5" />اختبر سؤالاً</a></div>
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-brass-400/40 bg-brass-100/55 p-5 text-sm leading-7 text-ink-700">
        <strong className="text-ink-900">ملاحظة للحكم:</strong> نتائج الـbenchmark يجب أن تُسجّل بعد تشغيل النسخة النهائية على بيئة التحدي. لا تُكتب أرقام يدوياً في العرض قبل وجود ملف نتائج فعلي.
      </div>
    </div>
  );
}
