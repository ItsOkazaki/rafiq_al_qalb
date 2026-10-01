"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenText,
  CheckCircle2,
  CircleHelp,
  Compass,
  ExternalLink,
  HeartHandshake,
  Info,
  KeyRound,
  Link2,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Telescope,
} from "lucide-react";
import type { AnswerClaim, ResearchResult } from "@/lib/types";
import { PassageCard } from "@/components/passage-card";
import { OrnamentDivider } from "@/components/ornaments";

export function ResearchResultView({ result }: { result: ResearchResult }) {
  if (result.outcome === "safety") return <SafetyView result={result} />;
  if (result.outcome === "fatwa") return <FatwaView result={result} />;
  if (result.outcome === "ai-unavailable") return <AIUnavailableView result={result} />;
  if (result.outcome === "abstained" || result.outcome === "invalid") return <AbstainView result={result} />;
  return <OkView result={result} />;
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-forest-700">
      <Icon className="size-4.5" strokeWidth={2} />
      {children}
    </h3>
  );
}

function OkView({ result }: { result: ResearchResult }) {
  const gate = result.diagnostics.evidenceGate;
  const claims = result.diagnostics.claims;
  const supportedClaims = claims.filter((c) => c.status === "supported");

  return (
    <div className="animate-rise space-y-8">
      <AIPipelineRibbon result={result} />

      {gate && (
        <section className="card-manuscript-deep rounded-2xl p-5 text-parchment-50 sm:p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <MetricCard label="كفاية الدليل" value={`${Math.round(gate.confidence * 100)}%`} note={`${gate.coveredSubquestions}/${gate.totalSubquestions} من جوانب السؤال مغطاة`} />
            <MetricCard label="الادعاءات الموثقة" value={`${result.diagnostics.verifiedClaimCount}/${result.diagnostics.totalClaimCount}`} note="لا يظهر في الإجابة إلا ما اجتاز التحقق" />
            <MetricCard label="المقاطع النهائية" value={`${result.passages.length}`} note={`${result.diagnostics.candidateCount} مرشحاً قبل إعادة الترتيب`} />
          </div>
        </section>
      )}

      <section className="card-manuscript rounded-2xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brass-600">Evidence-Gated AI Answer</p>
            <h2 className="heading-display mt-1 text-2xl font-bold text-forest-800">الإجابة الموثقة بالذكاء الاصطناعي</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-600/30 bg-forest-50 px-3 py-1.5 text-[11px] font-bold text-forest-700">
            <BadgeCheck className="size-3.5" strokeWidth={2} />
            مرّت عبر التحقق قبل العرض
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {supportedClaims.map((claim, index) => (
            <ClaimCard key={claim.id} claim={claim} index={index} passages={result.passages} />
          ))}
        </div>

        {result.diagnostics.conflicts.length > 0 && <ConflictPanel result={result} />}

        <p className="mt-6 flex items-start gap-2 rounded-xl border border-parchment-300 bg-parchment-200/50 p-4 text-[13px] leading-7 text-ink-600">
          <Info className="mt-1 size-4 shrink-0 text-brass-500" strokeWidth={2} />
          <span>
            الذكاء الاصطناعي هنا لا يضيف مصدراً من خارج المكتبة: يُستعمل لفهم السؤال، واسترجاعه دلالياً،
            وإعادة ترتيب الأدلة، ثم صياغة ادعاءات لا تُعرض إلا بعد فحص إسنادها.
          </span>
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle icon={ScrollText}>الأدلة المسترجعة — المصدر والموضع واضحان</SectionTitle>
          <span className="text-[11px] text-ink-500">Hybrid + AI Re-ranking</span>
        </div>
        <div className="space-y-5">
          {result.passages.map((p, i) => (
            <PassageCard key={p.chunkId} passage={p} index={i} />
          ))}
        </div>
      </section>

      <section className="card-manuscript rounded-2xl p-6">
        <SectionTitle icon={Telescope}>تدقيق القيمة المضافة للذكاء الاصطناعي</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AuditRow label="البحث الدلالي" ok={result.diagnostics.semanticRetrievalUsed} detail={result.diagnostics.embeddingModel ?? "غير متاح"} />
          <AuditRow label="إعادة الترتيب" ok={result.diagnostics.reranked.length > 0} detail={`${result.diagnostics.reranked.length} نتيجة رتبت بالصلة`} />
          <AuditRow label="بوابة الدليل" ok={Boolean(gate?.sufficient)} detail={gate ? `${Math.round(gate.confidence * 100)}% ثقة` : "غير متاح"} />
          <AuditRow label="التحقق من الادعاءات" ok={supportedClaims.length > 0} detail={`${supportedClaims.length} ادعاءات مدعومة`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-parchment-300 pt-4 text-xs">
          {result.diagnostics.baselineTopIds.slice(0, 4).map((id) => (
            <span key={id} className="rounded-full border border-parchment-300 bg-parchment-50 px-3 py-1 text-ink-500">Baseline: {id}</span>
          ))}
          {result.diagnostics.hybridTopIds.slice(0, 4).map((id) => (
            <span key={id} className="rounded-full border border-forest-600/30 bg-forest-50 px-3 py-1 font-medium text-forest-700">Hybrid: {id}</span>
          ))}
        </div>
      </section>

      {result.topics.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={Compass}>الأبواب المقترحة لمسار البحث</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {result.topics.map(({ topic }) => (
              <Link key={topic.id} href={`/maktaba/${topic.slug}`} className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 transition-colors hover:bg-forest-100">
                {topic.order}. {topic.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle icon={KeyRound}>الكلمات المفتاحية + خطة البحث التي فهمها النموذج</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((kw) => (
            <span key={kw} className="rounded-full border border-brass-400/50 bg-brass-100/70 px-3.5 py-1 text-xs font-medium text-brass-600">{kw}</span>
          ))}
        </div>
        {result.diagnostics.plan && (
          <div className="rounded-xl border border-parchment-300 bg-parchment-200/40 p-4 text-sm leading-7 text-ink-600">
            <p><strong className="text-ink-800">نية البحث:</strong> {result.diagnostics.plan.intent}</p>
            <p><strong className="text-ink-800">المسار الدلالي:</strong> {result.diagnostics.plan.semanticQuery}</p>
            {result.diagnostics.plan.subquestions.length > 0 && (
              <p><strong className="text-ink-800">تفكيك السؤال:</strong> {result.diagnostics.plan.subquestions.join(" — ")}</p>
            )}
          </div>
        )}
      </section>

      {result.diagnostics.claims.some((c) => c.status !== "supported") && (
        <section className="rounded-2xl border border-brass-400/40 bg-brass-100/50 p-5">
          <p className="text-sm font-bold text-ink-800">لماذا اختفت بعض الصياغات؟</p>
          <p className="mt-1 text-sm leading-7 text-ink-600">التحقق النهائي حذف أي ادعاء كان جزئياً أو غير مدعوم أو متعارضاً بدلاً من تمريره إلى المستخدم.</p>
        </section>
      )}

      {result.topics.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={CircleHelp}>أسئلة بحث ذات صلة</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {relatedQuestionsOf(result.topics).map((q) => (
              <Link key={q} href={`/hiwar?q=${encodeURIComponent(q)}`} className="rounded-full border border-parchment-300 bg-parchment-50 px-4 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brass-400/60 hover:text-forest-700">
                {q}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-brass-400/40 bg-brass-100/50 p-4 text-[13px] leading-7 text-ink-700">
        <Info className="mt-1 size-4 shrink-0 text-brass-500" strokeWidth={2} />
        <span>{result.disclaimer}</span>
      </p>
    </div>
  );
}

function AIPipelineRibbon({ result }: { result: ResearchResult }) {
  const steps = [
    ["فهم السؤال", Boolean(result.diagnostics.plan)],
    ["بحث دلالي", result.diagnostics.semanticRetrievalUsed],
    ["Re-ranking", result.diagnostics.reranked.length > 0],
    ["Evidence Gate", Boolean(result.diagnostics.evidenceGate?.sufficient)],
    ["Claim Verify", result.diagnostics.verifiedClaimCount > 0],
  ] as const;
  return (
    <section className="overflow-hidden rounded-2xl border border-forest-800/20 bg-forest-900 p-4 text-parchment-50 shadow-lift sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-brass-300/30 bg-forest-800 px-3 py-1 text-[11px] font-bold text-brass-200">
          <Telescope className="size-3.5" /> AI PIPELINE
        </span>
        <span className="text-[11px] text-parchment-200/70">لا توليد قبل اجتياز الدليل</span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {steps.map(([label, ok], i) => (
          <div key={label} className="rounded-xl border border-parchment-50/10 bg-forest-800/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-parchment-200/50">0{i + 1}</span>
              {ok ? <CheckCircle2 className="size-4 text-brass-300" strokeWidth={2} /> : <span className="size-3 rounded-full border border-parchment-50/25" />}
            </div>
            <p className="mt-3 text-xs font-bold">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-parchment-50/10 bg-forest-800/60 p-4">
      <p className="text-[11px] text-parchment-200/65">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brass-200">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-parchment-200/70">{note}</p>
    </div>
  );
}

function AuditRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-parchment-300 bg-parchment-50 p-4">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="size-4 text-forest-600" /> : <AlertTriangle className="size-4 text-brass-500" />}
        <span className="text-sm font-bold text-ink-700">{label}</span>
      </div>
      <span className="text-[11px] text-ink-500">{detail}</span>
    </div>
  );
}

function ClaimCard({ claim, index, passages }: { claim: AnswerClaim; index: number; passages: ResearchResult["passages"] }) {
  return (
    <article className="rounded-xl border border-forest-600/20 bg-forest-50/50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-700 text-xs font-bold text-parchment-50">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-8 text-ink-800">{claim.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-forest-700"><CheckCircle2 className="size-3.5" /> مدعوم</span>
            {claim.evidenceIds.map((id) => {
              const passageIndex = passages.findIndex((p) => p.chunkId === id);
              const passage = passageIndex >= 0 ? passages[passageIndex] : null;
              if (!passage) return null;
              return (
                <a key={id} href={`#evidence-${id}`} className="inline-flex items-center gap-1 rounded-full border border-parchment-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:border-brass-400/60 hover:text-forest-700">
                  <Link2 className="size-3" /> الدليل {passageIndex + 1}
                </a>
              );
            })}
          </div>
          {claim.verifierNote && <p className="mt-2 text-[11px] leading-5 text-ink-500">فحص: {claim.verifierNote}</p>}
        </div>
      </div>
    </article>
  );
}

function ConflictPanel({ result }: { result: ResearchResult }) {
  return (
    <div className="mt-6 rounded-xl border border-brass-400/45 bg-brass-100/60 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-ink-800"><SlidersHorizontal className="size-4" /> رصد آلي لتباين المصادر</div>
      <p className="mt-1 text-xs leading-6 text-ink-600">النظام لا يقرر أي مصدر أصح؛ يعرض فقط وجود توتر أو اختلاف في المادة المسترجعة حتى يراجعه الباحث.</p>
      <div className="mt-3 space-y-2">
        {result.diagnostics.conflicts.map((c, i) => (
          <div key={`${c.summary}-${i}`} className="rounded-lg border border-parchment-300 bg-parchment-50 p-3 text-xs leading-6 text-ink-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brass-400/35 bg-brass-100/70 px-2 py-0.5 text-[10px] font-bold text-brass-600">{conflictLabel(c.type)}</span>
              {c.sourceIds.map((sourceId) => {
                const passage = result.passages.find((p) => p.source.sourceId === sourceId);
                return passage ? (
                  <a key={sourceId} href={`#evidence-${passage.chunkId}`} className="rounded-full border border-parchment-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-600 hover:border-brass-400/60 hover:text-forest-700">
                    {passage.source.title}
                  </a>
                ) : null;
              })}
            </div>
            <p className="mt-2">{c.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function conflictLabel(type: ResearchResult["diagnostics"]["conflicts"][number]["type"]): string {
  if (type === "explicit-contradiction") return "تعارض صريح";
  if (type === "different-emphasis") return "اختلاف في التركيز";
  return "توتر ظاهري";
}

function AIUnavailableView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise space-y-6">
      <div className="card-manuscript-deep rounded-2xl p-7 text-parchment-50 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-brass-300/30 bg-forest-800"><Search className="size-5 text-brass-200" /></span>
          <div>
            <h3 className="heading-display text-2xl font-bold">المادة موجودة، لكن مسار AI لم يكتمل</h3>
            <p className="mt-2 max-w-2xl text-sm leading-8 text-parchment-200/85">{result.message}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-parchment-50/10 bg-forest-800/65 p-4 text-xs leading-6 text-parchment-200/80">
          <strong className="text-brass-200">تشغيل بلا مفتاح سري:</strong> اضبط مزوداً متوافقاً مع OpenAI محلياً مثل Ollama، أو ضع مفتاحاً عبر متغيرات البيئة في بيئة النشر. لا تضف المفتاح إلى GitHub.
        </div>
      </div>
      {result.diagnostics.degradedReason && (
        <details className="card-manuscript rounded-2xl p-5">
          <summary className="cursor-pointer text-sm font-bold text-ink-700">تفاصيل فنية لمسار AI (للفريق)</summary>
          <p className="mt-3 break-words font-mono text-xs leading-6 text-ink-500">{result.diagnostics.degradedReason}</p>
          <p className="mt-2 text-xs text-ink-500">لا يتم عرض مفاتيح API أو قيم الأسرار هنا.</p>
        </details>
      )}
      {result.passages.length > 0 && (
        <section className="space-y-4">
          <SectionTitle icon={ScrollText}>أدلة baseline المتاحة للمراجعة</SectionTitle>
          {result.passages.map((p, i) => <PassageCard key={p.chunkId} passage={p} index={i} />)}
        </section>
      )}
    </div>
  );
}

function relatedQuestionsOf(topics: ResearchResult["topics"]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [i, m] of topics.entries()) {
    const limit = i === 0 ? 2 : 1;
    for (const q of m.topic.relatedQuestions.slice(0, limit)) {
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    }
  }
  return out.slice(0, 4);
}

function AbstainView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise card-manuscript rounded-2xl p-7 text-center sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-brass-400/50 bg-brass-100 text-brass-500"><BookOpenText className="size-6" strokeWidth={1.8} /></span>
      <h3 className="heading-display mt-5 text-2xl font-bold text-ink-800">امتناع موثّق</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-8 text-ink-600">
        {result.message ?? "لم نجد مادة كافية من المصادر المعتمدة لهذا الموضوع."}
        {" "}لا يستحدث النظام جواباً من خارج المصادر المعتمدة.
      </p>
      {result.diagnostics.evidenceGate && (
        <div className="mx-auto mt-5 max-w-lg rounded-xl border border-parchment-300 bg-parchment-200/50 p-4 text-xs leading-6 text-ink-600">
          بوابة الدليل: {Math.round(result.diagnostics.evidenceGate.confidence * 100)}% —
          غُطي {result.diagnostics.evidenceGate.coveredSubquestions} من {result.diagnostics.evidenceGate.totalSubquestions} جوانب السؤال.
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {result.suggestions.map((s) => (
          <Link key={s.slug} href={`/maktaba/${s.slug}`} className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100">{s.title}</Link>
        ))}
      </div>
      <OrnamentDivider />
      <p className="mt-4 text-xs text-ink-500">{result.disclaimer}</p>
    </div>
  );
}

function FatwaView({ result }: { result: ResearchResult }) {
  return (
    <div className="animate-rise card-manuscript rounded-2xl p-7 sm:p-9">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-oxblood-700/30 bg-oxblood-100 text-oxblood-700"><AlertTriangle className="size-5" strokeWidth={1.9} /></span>
        <div>
          <h3 className="heading-display text-2xl font-bold text-ink-800">هذه من مسائل الفتوى</h3>
          <p className="mt-2 max-w-2xl text-sm leading-8 text-ink-600">{result.message}</p>
          {result.fatwa?.matter && <p className="mt-1 text-xs font-medium text-ink-500">صنّف النظام سؤالك ضمن: {result.fatwa.matter}.</p>}
        </div>
      </div>
      {result.suggestions.length > 0 && (
        <div className="mt-6 rounded-xl border border-parchment-300 bg-parchment-200/50 p-5">
          <p className="text-sm font-semibold text-ink-700">تحويل اختياري إلى مسار بحث علمي دون أي حكم شرعي:</p>
          <div className="mt-3 flex flex-wrap gap-2">{result.suggestions.map((s) => <Link key={s.slug} href={`/maktaba/${s.slug}`} className="rounded-full border border-forest-600/35 bg-forest-50 px-4 py-1.5 text-sm font-semibold text-forest-700 hover:bg-forest-100">{s.title}</Link>)}</div>
        </div>
      )}
      <p className="mt-6 border-t border-parchment-300 pt-4 text-xs leading-6 text-ink-500">{result.disclaimer}</p>
    </div>
  );
}

function SafetyView({ result }: { result: ResearchResult }) {
  const safety = result.safety;
  if (!safety) return null;
  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-oxblood-700/25 bg-parchment-50 shadow-manuscript">
      <div className="bg-oxblood-800 px-7 py-5 text-parchment-50"><div className="flex items-center gap-3"><ShieldAlert className="size-6" strokeWidth={1.8} /><h3 className="heading-display text-2xl font-bold">{safety.title}</h3></div></div>
      <div className="space-y-5 p-7 sm:p-8"><p className="text-sm leading-8 text-ink-700">{safety.message}</p><ol className="space-y-3">{safety.steps.map((step, i) => <li key={i} className="flex items-start gap-3 text-sm leading-7 text-ink-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-oxblood-100 text-xs font-bold text-oxblood-700">{i + 1}</span>{step}</li>)}</ol><p className="flex items-start gap-2 rounded-xl border border-parchment-300 bg-parchment-200/60 p-4 text-[13px] leading-7 text-ink-600"><HeartHandshake className="mt-0.5 size-4 shrink-0 text-forest-600" strokeWidth={1.9} />بعد اطمئنانك على نفسك، يمكنك العودة والبحث في أبواب المكتبة لغرض الاطلاع العلمي.</p></div>
    </div>
  );
}

export function RetrievalMetaNote({ result }: { result: ResearchResult }) {
  if (result.outcome !== "ok") return null;
  return <p className="flex items-center gap-1.5 text-[11px] text-ink-500"><ExternalLink className="size-3" />{result.passages.length} مقاطع نهائية بعد البحث الهجين وإعادة الترتيب.</p>;
}
