import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaroBot Manager — Karotter Bot管理サービス",
  description: "誰でも簡単にKarotter向けのBotを作成・管理できるWebサービス。AIによる自動投稿、いいね、リカロート、リプライなどを設定一つで実現。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
