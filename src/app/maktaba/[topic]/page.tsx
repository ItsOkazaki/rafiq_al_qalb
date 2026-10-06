import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, KeyRound, MessagesSquare } from "lucide-react";
import { getTopicBySlug, getTopicById, TOPICS } from "@/lib/rag/topics";
import { getChunksByTopic } from "@/lib/corpus/chunks";
import { toRetrievedPassages } from "@/lib/corpus/passages";
import { PassageList } from "@/components/passage-list";
import { OrnamentDivider } from "@/components/ornaments";
import type { RetrievedPassage } from "@/lib/types";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) return { title: "موضوع غير موجود" };
  return { title: topic.title, description: topic.description };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  // الحارس واحد في كل المسارات: مقطع مصدره غير مسجّل/غير نشط/مستبعد يُتجاوز،
  // ولا يُفترض وجود المصدر أبداً (كان هنا `getSourceById(...)!`).
  const passages: RetrievedPassage[] = toRetrievedPassages(getChunksByTopic(topic.id));

  const related = topic.related
    .map((id) => getTopicById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12">
      <nav className="flex items-center gap-2 text-xs text-parchment-200/65">
        <Link href="/maktaba" className="link-brass font-semibold">المكتبة المعتمدة</Link>
        <ArrowRight className="size-3" />
        <span className="text-parchment-200/82">{topic.title}</span>
      </nav>

      <header className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-brass-600">الباب {topic.order} من ١٢</p>
        <h1 className="heading-display mt-1 text-4xl font-bold text-parchment-50">{topic.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-parchment-200/65">{topic.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <KeyRound className="size-3.5 text-brass-500" strokeWidth={2} />
          {topic.keywords.map((kw) => (
            <span key={kw} className="rounded-full border border-brass-400/50 bg-brass-100/70 px-3 py-0.5 text-[11px] font-medium text-brass-600">
              {kw}
            </span>
          ))}
        </div>
        <div className="mt-6"><OrnamentDivider /></div>
      </header>

      <section className="mt-8 space-y-6">
        <p className="text-sm font-semibold text-parchment-200/82">
          المادة المفهرسة في هذا الباب — {passages.filter((p) => p.role !== "index").length} مقاطع أدلة و{passages.filter((p) => p.role === "index").length} مداخل فهرسة موضوعية من المصدر المعتمد:
        </p>
        <PassageList passages={passages} />
      </section>

      <section className="mt-10 rounded-2xl border border-parchment-300 bg-parchment-200/60 p-6">
        <p className="text-sm font-bold text-ink-700">أسئلة بحث ذات صلة بهذا الباب</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topic.relatedQuestions.map((q) => (
            <Link
              key={q}
              href={`/hiwar?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-parchment-300 bg-parchment-50 px-4 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brass-400/60 hover:text-forest-700"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      <aside className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-parchment-300 bg-parchment-200/60 p-6">
        <div>
          <p className="text-sm font-bold text-ink-700">أبواب مرتبطة</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {related.map((t) => (
              <Link key={t.id} href={`/maktaba/${t.slug}`} className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100">
                {t.order}. {t.title}
              </Link>
            ))}
          </div>
        </div>
        <Link
          href={`/hiwar?q=${encodeURIComponent(`أريد البحث في ${topic.title}`)}`}
          className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-parchment-50 hover:bg-forest-800"
        >
          <MessagesSquare className="size-4" />
          ابحث في هذا الباب حوارياً
        </Link>
      </aside>
    </div>
  );
}
