"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Compass, KeyRound, RotateCcw } from "lucide-react";
import { OrnamentDivider } from "@/components/ornaments";
import {
  QUESTIONNAIRE_AREAS,
  REFINEMENT_QUESTIONS,
  resolveQuestionnairePath,
} from "@/lib/questionnaire";

type Step = 1 | 2 | 3;

export function Questionnaire() {
  const [step, setStep] = useState<Step>(1);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const refinements = useMemo(
    () => REFINEMENT_QUESTIONS.filter((q) => q.areaId === areaId),
    [areaId],
  );

  const result = useMemo(
    () => (areaId ? resolveQuestionnairePath(areaId, checked) : null),
    [areaId, checked],
  );

  const reset = () => {
    setStep(1);
    setAreaId(null);
    setChecked([]);
  };

  return (
    <div className="card-manuscript rounded-2xl p-6 sm:p-8">
        {/* مؤشر الخطوات */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-ink-500">
          {["المجال", "التضييق", "المسار"].map((label, i) => (
            <span key={label} className="flex items-center gap-2">
              <span
                className={`grid size-7 place-items-center rounded-full border text-xs ${
                  step > i
                    ? "border-forest-600 bg-forest-700 text-parchment-50"
                    : "border-parchment-300 bg-parchment-50"
                }`}
              >
                {step > i + 1 ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {label}
              {i < 2 && <span className="h-px w-8 bg-parchment-300" aria-hidden />}
            </span>
          ))}
        </div>

        <div className="mt-6"><OrnamentDivider /></div>

        {/* الخطوة ١: المجال */}
        {step === 1 && (
          <div className="animate-rise mt-8 space-y-3">
            <p className="text-center text-sm font-bold text-ink-700">
              الخطوة الأولى — في أي مجال تريد أن تبحث؟
            </p>
            {QUESTIONNAIRE_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => {
                  setAreaId(area.id);
                  setChecked([]);
                  setStep(2);
                }}
                className="group flex w-full items-center justify-between gap-4 rounded-xl border border-parchment-300 bg-parchment-50 p-4 text-right transition-all hover:border-brass-400/60 hover:bg-brass-100/40"
              >
                <span className="text-sm font-semibold leading-7 text-ink-700 group-hover:text-forest-700">
                  {area.question}
                </span>
                <ArrowLeft className="size-4 shrink-0 text-brass-500 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
              </button>
            ))}
            <p className="pt-2 text-center text-[11px] leading-6 text-ink-500">
              لاحظ: كل الأسئلة ملاحية للبحث («هل تريد البحث في…؟») — لا يوجد هنا أي سؤال عن شدة حالة أو وصف شخصي.
            </p>
          </div>
        )}

        {/* الخطوة ٢: التضييق */}
        {step === 2 && (
          <div className="animate-rise mt-8 space-y-3">
            <p className="text-center text-sm font-bold text-ink-700">
              الخطوة الثانية — ضيّق موضوع البحث (اختر ما ينطبق على بحثك)
            </p>
            {refinements.map((q) => {
              const on = checked.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() =>
                    setChecked((prev) =>
                      on ? prev.filter((id) => id !== q.id) : [...prev, q.id],
                    )
                  }
                  className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-right transition-all ${
                    on
                      ? "border-forest-600/50 bg-forest-50"
                      : "border-parchment-300 bg-parchment-50 hover:border-brass-400/60"
                  }`}
                >
                  <span className="text-sm font-semibold leading-7 text-ink-700">{q.question}</span>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                      on ? "border-forest-600 bg-forest-700 text-parchment-50" : "border-parchment-300"
                    }`}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
            <div className="flex items-center justify-between pt-4">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-forest-700">
                <ArrowRight className="size-3.5" /> السابق
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-2 text-sm font-bold text-parchment-50 hover:bg-forest-800"
              >
                عرض المسار البحثي
                <ArrowLeft className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* الخطوة ٣: النتيجة */}
        {step === 3 && result && (
          <div className="animate-rise mt-8 space-y-7">
            <p className="text-center text-sm font-bold text-ink-700">
              مسار البحث المقترح — أبواب وكلمات مفتاحية (وليس تقييماً لأي حالة)
            </p>

            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold tracking-wide text-forest-700">
                <Compass className="size-4" strokeWidth={2} /> أبواب البحث
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/maktaba/${t.slug}`}
                    className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100"
                  >
                    {t.title}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold tracking-wide text-forest-700">
                <KeyRound className="size-4" strokeWidth={2} /> الكلمات المفتاحية المقترحة
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.keywords.map((kw) => (
                  <span key={kw} className="rounded-full border border-brass-400/50 bg-brass-100/70 px-3.5 py-1 text-xs font-medium text-brass-600">
                    {kw}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-parchment-300 bg-parchment-200/50 p-4">
              <p className="text-xs font-semibold text-ink-600">استعلام بحث جاهز:</p>
              <p className="passage-text mt-1 !text-base leading-8 text-ink-700">{result.query}</p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-parchment-300 pt-5">
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-forest-700">
                <RotateCcw className="size-3.5" /> إعادة الاستبانة
              </button>
              <Link
                href={`/hiwar?q=${encodeURIComponent(result.query)}`}
                className="inline-flex items-center gap-2 rounded-full bg-brass-400 px-6 py-2.5 text-sm font-bold text-forest-900 hover:bg-brass-300"
              >
                استرجاع المادة بهذا المسار
                <ArrowLeft className="size-4" />
              </Link>
            </div>

            <p className="text-center text-[11px] leading-6 text-ink-500">
              هذه مادة وتوجيه للبحث والدراسة — وليست تشخيصاً ولا فتوى ولا خطة علاجية.
            </p>
          </div>
        )}
      </div>
  );
}
