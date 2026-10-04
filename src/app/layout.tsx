import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "السبورة الذكية | SmartBoard - منصة الشرح التفاعلي",
  description:
    "سبورة ذكية تفاعلية للمعلمين في المدارس والجامعات. أدوات رسم، أشكال، ملاحظات، قوالب تعليمية، وتصدير. اجعل الشرح سهلاً وممتعاً.",
  keywords: ["سبورة ذكية", "smart whiteboard", "تعليم", "شرح تفاعلي", "معلمين"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
