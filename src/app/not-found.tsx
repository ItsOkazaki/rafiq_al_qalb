import Link from "next/link";
import { OrnamentDivider } from "@/components/ornaments";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-24 text-center">
      <p className="font-ornament text-6xl text-brass-400">٤٠٤</p>
      <h1 className="heading-display mt-4 text-3xl font-bold text-ink-800">صفحة غير موجودة</h1>
      <div className="mx-auto mt-5 max-w-xs"><OrnamentDivider /></div>
      <p className="mt-4 text-sm leading-8 text-ink-500">
        المسار الذي طلبته غير متاح. يمكنك العودة إلى المكتبة المعتمدة أو بدء حوار بحثي.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link href="/" className="rounded-full bg-forest-700 px-6 py-2.5 text-sm font-bold text-parchment-50 hover:bg-forest-800">
          الرئيسية
        </Link>
        <Link href="/maktaba" className="link-brass text-sm font-semibold">المكتبة المعتمدة</Link>
      </div>
    </div>
  );
}
