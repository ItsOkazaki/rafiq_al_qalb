import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/aref-ruqaa/400.css";
import "@fontsource/aref-ruqaa/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/chrome";

export const metadata: Metadata = {
  title: {
    default: "رفيق القلوب — مساعد بحث علمي من مصادر معتمدة",
    template: "%s — رفيق القلوب",
  },
  description:
    "رفيق القلوب مساعد بحث علمي: يحدد أبواب البحث والكلمات المفتاحية، ويسترجع المادة من المصادر المعتمدة فحسب ويعرضها مع مصدرها وموضعها. لا يشخّص ولا يُفتي ولا يصف علاجاً.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-parchment-100 bg-arabesque paper-grain text-ink-800 antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
