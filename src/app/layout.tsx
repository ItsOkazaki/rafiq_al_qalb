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
    default: "رفيق القلوب — أداة حوارية لاسترجاع المادة العلمية الموثقة",
    template: "%s — رفيق القلوب",
  },
  description:
    "رفيق القلوب أداة حوارية تستقبل موضوع بحثك، تحدد بابه المناسب، وتسترجع المادة حصراً من مصادر مفهرسة مع إسناد دقيق (مصدر + جزء/صفحة + رابط أصلي). لا تشخّص ولا تُفتي ولا تصف علاجاً.",
  icons: {
    icon: "/logo/icons/main.png",
    apple: "/logo/icons/main.png",
  },
  openGraph: {
    title: "رفيق القلوب — أداة حوارية لاسترجاع المادة الموثقة",
    description: "تسترجع المادة العلمية حصراً من مصادر مفهرسة — لا تشخيص ولا فتوى ولا وصفات.",
    images: [{ url: "/logo/Main/main.png", width: 1866, height: 1649, alt: "شعار رفيق القلوب" }],
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "رفيق القلوب",
    description: "أداة حوارية — مادة موثقة حصراً من مصادر مفهرسة",
    images: ["/logo/Main/main.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen text-parchment-100 antialiased">
        <div className="bg-arabesque-overlay" aria-hidden />
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
