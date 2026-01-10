import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "新闻胶囊 - AI时代的新闻阅读方式",
  description: "为你精选近期重要新闻事件，兼顾速读与精读 —— 既提供文章概要，也呈现原文阅读建议",
  keywords: "每日新闻, 每日要闻, 科技新闻, 财经新闻",
  openGraph: {
    title: "新闻胶囊 - AI时代的新闻阅读方式",
    description: "为你精选近期重要新闻事件，兼顾速读与精读 —— 既提供文章概要，也呈现原文阅读建议",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
