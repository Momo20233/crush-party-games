import type { Metadata } from "next";
import "./globals.css";

const title = "别惹小毛头｜MOTO 16选1聚会挑战";
const description = "轮流点一个小毛头，点中暴怒小毛头的人接受挑战。打开就能玩的手机聚会游戏。";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const publicAsset = (path: string) => `${basePath}${path}`;

function getMetadataBase(): URL {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return new URL("http://localhost:3000");

  try {
    return new URL(siteUrl);
  } catch {
    throw new Error("SITE_URL 必须是包含 http:// 或 https:// 的完整网址");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title,
  description,
  icons: { icon: publicAsset("/assets/seven-happy.png") },
  openGraph: { title, description, type: "website", images: [{ url: publicAsset("/og.png"), width: 1729, height: 910 }] },
  twitter: { card: "summary_large_image", title, description, images: [publicAsset("/og.png")] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
