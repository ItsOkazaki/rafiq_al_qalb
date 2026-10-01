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
    "رفيق القلوب نظام بحث عربي مدعوم بالذكاء الاصطناعي: يفهم السؤال، يبحث دلالياً وهجيناً في مصادر معتمدة، يعيد ترتيب الأدلة، ويتحقق من إسناد الادعاءات قبل العرض. لا يشخّص ولا يُفتي ولا يصف علاجاً.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "رفيق القلوب — Evidence-Gated AI RAG",
    description: "تسترجع المادة العلمية حصراً من مصادر مفهرسة — لا تشخيص ولا فتوى ولا وصفات.",
    images: [{ url: "/logo.png", width: 1080, height: 1080, alt: "شعار رفيق القلوب" }],
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "رفيق القلوب",
    description: "أداة حوارية — مادة موثقة حصراً من مصادر مفهرسة",
    images: ["/logo.png"],
  },
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
