import type { Metadata } from "next";
import { Suspense } from "react";
import { ResearchConsole } from "@/app/hiwar/research-console";

export const metadata: Metadata = {
  title: "الحوار البحثي",
  description:
    "اكتب موضوع بحثك فيسترجع رفيق القلوب المادة الفعلية من المصادر المعتمدة مع المصدر والموضع ورابط الأصل.",
};

export default function HiwarPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12">
      <header className="text-center">
        <h1 className="heading-display text-4xl font-bold text-forest-800">الحوار البحثي</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          اكتب موضوعك بصيغة وصف بسيط. سيفهمه النظام بوصفه <strong className="text-ink-700">موضوع بحث</strong>،
          يحدد الأبواب والكلمات المفتاحية، ثم يسترجع المادة الفعلية من المصادر المعتمدة.
        </p>
      </header>
      <div className="mt-10">
        <Suspense fallback={<div className="card-manuscript h-72 animate-pulse rounded-2xl" />}>
          <ResearchConsole />
        </Suspense>
      </div>
    </div>
  );
}
