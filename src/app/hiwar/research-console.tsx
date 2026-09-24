"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrnamentDivider } from "@/components/ornaments";
import { ResearchResultView } from "@/components/research-result";
import type { ResearchResult } from "@/lib/types";
import { Loader2, Search, ShieldCheck } from "lucide-react";

const EXAMPLES = [
  "أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن",
  "أريد البحث في التوبة وتكرار الذنب",
  "موضوعات في الهم والقلق وضيق الصدر",
  "آثار الذكر والغفلة في القلب",
];

export function ResearchConsole() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  const run = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as ResearchResult;
      setResult(data);
    } catch {
      setError("تعذّر تشغيل خدمة البحث. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const q = params.get("q");
    if (q && !ranRef.current) {
      ranRef.current = true;
      setQuery(q);
      void run(q);
    }
  }, [params, run]);

  return (
    <div className="space-y-10">
      <div className="card-manuscript rounded-2xl p-6 sm:p-8">
          <label htmlFor="research-query" className="block text-sm font-bold text-ink-700">
            صِف موضوع بحثك
          </label>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            يُفهم وصفك مدخلاً لتحديد مسار بحث — لا يشخَّص ولا تُقيَّم حالة شخصية.
          </p>
          <textarea
            id="research-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(query);
            }}
            rows={4}
            maxLength={1000}
            placeholder="مثال: أشعر أن قلبي قاسٍ ولا أتأثر بالموعظة، وأريد مادة علمية في هذا الموضوع…"
            className="research-input mt-4 w-full resize-y rounded-xl p-4 text-[15px] leading-8 text-ink-800 placeholder:text-ink-500/60"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void run(query)}
              disabled={loading || query.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-2.5 text-sm font-bold text-parchment-50 shadow-manuscript transition-all hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" strokeWidth={2.2} />}
              استرجاع المادة البحثية
            </button>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
              <ShieldCheck className="size-3.5 text-forest-600" strokeWidth={2} />
              البحث مقصور على سجل المصادر المعتمدة — والامتناع مضمون عند غياب المادة
            </span>
          </div>

          <div className="mt-6 border-t border-parchment-300/70 pt-4">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-500">أمثلة لمداخل بحثية:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    void run(ex);
                  }}
                  className="rounded-full border border-parchment-300 bg-parchment-50 px-3.5 py-1.5 text-xs text-ink-600 transition-colors hover:border-brass-400/60 hover:text-forest-700"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-8" role="status" aria-live="polite">
          <svg viewBox="0 0 24 24" className="animate-ornament size-8 stroke-brass-400" fill="none" strokeWidth="1.4">
            <path d="M12 3l2.2 5.4 5.8.6-4.4 3.8 1.3 5.7L12 15.4l-4.9 3.1 1.3-5.7L4 9l5.8-.6L12 3z" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-ink-500">يحدد المسار، ويستخرج الكلمات، ويسترجع من المصدر المعتمد…</p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-oxblood-700/30 bg-oxblood-100 p-4 text-center text-sm font-semibold text-oxblood-700">
          {error}
        </p>
      )}

      {result && !loading && (
        <>
          <OrnamentDivider />
          <ResearchResultView result={result} />
        </>
      )}
    </div>
  );
}
