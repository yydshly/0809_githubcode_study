import type { Metadata } from "next";
import { ImmersiveViewer } from "@/app/components/ImmersiveViewer";
import "./globals.css";

const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4317");

export const metadata: Metadata = {
  metadataBase,
  title: "Zine Skill 能力研究站",
  description: "13 个独立 Zine Skill 的能力、场景、上游样例与本地扩展实验。",
  openGraph: {
    title: "Zine Skill 能力研究站",
    description: "13 个独立研究目标：上游证据、能力拆解、场景迁移与扩展路线。",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Zine Skill 能力研究站" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zine Skill 能力研究站",
    description: "13 个独立研究目标：上游证据、能力拆解、场景迁移与扩展路线。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}<ImmersiveViewer /></body>
    </html>
  );
}
