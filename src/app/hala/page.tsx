import type { Metadata } from "next";
import { Questionnaire } from "@/app/hala/questionnaire";

export const metadata: Metadata = {
  title: "لمحة بحثية",
  description:
    "أسئلة ملاحة بحثية تساعدك على تحديد موضوع البحث والكلمات المفتاحية — لا أسئلة تشخيصية ولا تقييم لحالات.",
};

export default function HalaPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-12">
      <header className="text-center">
        <h1 className="heading-display text-4xl font-bold text-forest-800">لمحة بحثية</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          ليست استبانتنا مقياساً لحالة ولا سؤالاً عن شدة أمر — بل أسئلة ملاحة تحدد
          <strong className="text-ink-700"> ما الذي تريد البحث فيه</strong>، فتخرج بمسار
          أبواب وكلمات مفتاحية جاهزة للاسترجاع.
        </p>
      </header>
      <div className="mt-10">
        <Questionnaire />
      </div>
    </div>
  );
}
