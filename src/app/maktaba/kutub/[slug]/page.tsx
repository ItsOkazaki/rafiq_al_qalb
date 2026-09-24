import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";
import { ACTIVE_SOURCES, getActiveSourceBySlug } from "@/lib/sources/registry";
import { getChunksBySource } from "@/lib/corpus/chunks";
import { TOPICS } from "@/lib/rag/topics";
import { PassageCard } from "@/components/passage-card";
import { ApprovalStamp, OrnamentDivider } from "@/components/ornaments";
import type { RetrievedPassage } from "@/lib/types";

export function generateStaticParams() {
  return ACTIVE_SOURCES.map((source) => ({ slug: source.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const src = getActiveSourceBySlug(slug);
  if (!src) return { title: "مصدر غير موجود" };
  return { title: src.title, description: src.notes };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const src = getActiveSourceBySlug(slug);
  if (!src) notFound();

  const chunks = getChunksBySource(src.id);
  const passages: RetrievedPassage[] = chunks.map((c, i) => ({
    chunkId: c.id,
    text: c.text,
    chapter: c.chapter,
    page: c.page,
    citationStatus: c.citationStatus ?? "chapter-only",
    excerptType: c.excerptType,
    keywords: c.keywords,
    score: 10 - i,
    source: {
      sourceId: src.id,
      slug: src.slug,
      title: src.title,
      author: src.author,
      publisher: src.publisher,
      registryUrl: src.registryUrl,
      originalUrl: c.sourceUrl ?? src.originalUrl,
      verificationUrl: src.verificationUrl,
      verificationLabel: src.verificationLabel,
    },
  }));

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12">
      <nav className="flex items-center gap-2 text-xs text-ink-500">
        <Link href="/maktaba" className="link-brass font-semibold">المكتبة المعتمدة</Link>
        <ArrowRight className="size-3" />
        <span className="text-ink-700">{src.title}</span>
      </nav>

      <header className="card-manuscript mt-6 rounded-2xl p-7">
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalStamp />
          <span className="rounded-full border border-parchment-300 px-3 py-1 text-[11px] text-ink-500">{src.category}</span>
        </div>
        <h1 className="heading-display mt-4 text-3xl font-bold leading-[1.6] text-forest-800">{src.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{src.author}</p>

        <dl className="mt-5 grid gap-3 rounded-xl border border-parchment-300 bg-parchment-200/50 p-5 text-[13px] leading-7 text-ink-600 sm:grid-cols-2">
          <div><dt className="font-bold text-ink-700">الناشر المعتمد</dt><dd>{src.publisher}</dd></div>
          <div>
            <dt className="font-bold text-ink-700">المقاطع المفهرسة</dt>
            <dd>{passages.length} مقطعاً مستخدماً في الاسترجاع</dd>
          </div>
          <div className="sm:col-span-2"><dt className="font-bold text-ink-700">ملاحظات التوثيق</dt><dd>{src.notes}</dd></div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={src.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-5 py-2 text-sm font-bold text-parchment-50 hover:bg-forest-800"
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            فتح المصدر الأصلي
          </Link>
          {src.verificationUrl && (
            <Link
              href={src.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-brass inline-flex items-center gap-1 text-xs font-semibold"
            >
              <ExternalLink className="size-3" />
              {src.verificationLabel ?? "فتح النسخة الرسمية للتحقق"}
            </Link>
          )}
          <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <BadgeCheck className="size-3.5 text-forest-600" />
            يُعرض كل مقطع مع اسمه وموضعه ورابط الأصل — لا إحالات مجهولة
          </span>
        </div>
      </header>

      <section className="mt-10 space-y-6">
        <OrnamentDivider />
        <h2 className="heading-display text-2xl font-bold text-forest-800">
          المقاطع المفهرسة — {passages.length} مقطعاً
        </h2>
        <p className="text-sm leading-7 text-ink-500">
          الأبواب التي تغطيها مادة هذا المصدر:
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <Link key={topic.id} href={`/maktaba/${topic.slug}`} className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-100">
              {topic.order}. {topic.title}
            </Link>
          ))}
        </div>
        {passages.map((passage, index) => (
          <PassageCard key={passage.chunkId} passage={passage} index={index} />
        ))}
      </section>
    </div>
  );
}
