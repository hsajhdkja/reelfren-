"use client";

// App 式底部导航:按当前路径高亮入口;登录/注册/管理页自动隐藏
import Link from "next/link";
import { usePathname } from "next/navigation";

// href = 去哪;match = 用哪段路径判断高亮(null = 不参与高亮)
const ITEMS = [
  { href: "/", match: "/", label: "首页", icon: "🏠" },
  { href: "/#discover", match: null, label: "分类", icon: "🔍" },
  { href: "/favorites", match: "/favorites", label: "收藏", icon: "❤️" },
  { href: "/me", match: "/me", label: "我的", icon: "👤" },
  { href: "/assistant", match: "/assistant", label: "AI 助手", icon: "🤖" },
];

// 这些页面不显示底部导航
const HIDDEN_ON = ["/login", "/register", "/admin"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {ITEMS.map((item) => {
        const active =
          item.match !== null &&
          (item.match === "/"
            ? pathname === "/"
            : pathname.startsWith(item.match));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${active ? "bottom-nav-active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
