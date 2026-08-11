"use client";

import Link from "@/app/components/Link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { key: "home", href: "/", label: "首页" },
  { key: "skills", href: "/skills", label: "13 个 Skill" },
  { key: "research", href: "/research", label: "研究总索引" },
  { key: "choose", href: "/choose", label: "选 Skill" },
  { key: "comparison", href: "/comparison", label: "统一原图横评" },
  { key: "multi-source", href: "/labs/multi-source", label: "多原图实验室" },
] as const;

function getActiveNavigationKey(pathname: string) {
  const normalizedPathname = pathname.replace(/^\/0809_githubcode_study(?=\/|$)/, "") || "/";
  if (normalizedPathname === "/") return "home";
  if (normalizedPathname === "/skills" || normalizedPathname.startsWith("/skills/")) return "skills";
  if (normalizedPathname === "/research" || normalizedPathname.startsWith("/reports/")) return "research";
  if (normalizedPathname === "/choose" || normalizedPathname.startsWith("/choose/")) return "choose";
  if (normalizedPathname === "/comparison" || normalizedPathname.startsWith("/comparison/")) return "comparison";
  if (normalizedPathname === "/labs/multi-source" || normalizedPathname.startsWith("/labs/multi-source/")) return "multi-source";
  return "home";
}

export function SiteHeader() {
  const pathname = usePathname();
  const activeNavigationKey = getActiveNavigationKey(pathname);

  return (
    <>
      <header className="site-header">
        <Link className="site-brand" href="/">
          <span>ZINE SKILL ATLAS</span>
          <strong>能力研究站</strong>
        </Link>
        <nav aria-label="主要导航">
          {navigationItems.map((item) => (
            <Link
              aria-current={activeNavigationKey === item.key ? "page" : undefined}
              data-nav-key={item.key}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <aside className="publication-notice" aria-label="公开研究展示说明">
        <strong>公开研究展示</strong>
        <p>上游样例保留原仓库与许可说明，仅用于能力对照；本地效果是研究性演绎，不代表上游官方运行；产品画布是数字预演，不代表实体生产或客户案例。</p>
        <a href="https://github.com/yydshly/0809_githubcode_study/blob/main/projects/skill-zine-summary/UPSTREAM.md" rel="noreferrer" target="_blank">来源与许可 ↗</a>
      </aside>
    </>
  );
}
