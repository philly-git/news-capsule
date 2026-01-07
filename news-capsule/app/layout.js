import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "新闻胶囊 - 每日科技要闻速递",
  description: "像吞服胶囊一样简单，在最短时间内获取不应错过的科技资讯。每天7-10条精选要闻，3分钟读完。",
  keywords: "科技新闻, 每日要闻, AI, 科技资讯, 新闻胶囊",
  openGraph: {
    title: "新闻胶囊 - 每日科技要闻速递",
    description: "像吞服胶囊一样简单，在最短时间内获取不应错过的科技资讯。",
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
