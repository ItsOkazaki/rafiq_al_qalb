export function OrnamentDivider({ tone = "brass" }: { tone?: "brass" | "gold" | "forest" }) {
  const stroke =
    tone === "gold" ? "stroke-brass-300" : tone === "forest" ? "stroke-forest-300" : "stroke-brass-400";
  const line =
    tone === "gold"
      ? "from-transparent via-brass-300/60 to-transparent"
      : tone === "forest"
        ? "from-transparent via-forest-300/40 to-transparent"
        : "from-transparent via-brass-400/50 to-transparent";
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className={`h-px flex-1 bg-gradient-to-l ${line}`} />
      <svg viewBox="0 0 24 24" className={`size-4 ${stroke}`} fill="none" strokeWidth="1.5">
        <path d="M12 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" strokeLinejoin="round" />
      </svg>
      <span className={`h-px flex-1 bg-gradient-to-l ${line}`} />
    </div>
  );
}

/** ختم دائري يدل على اعتماد المصدر */
export function ApprovalStamp({ label = "مصدر معتمد" }: { label?: string }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full border border-forest-400/30 bg-forest-700/30 px-3 py-1 text-[11px] font-semibold text-forest-200">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
