"use client";

// 顶栏的登录区:问一次 /api/auth/me,按结果显示"登录/注册"或"邮箱/退出"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Me = { id: number; email: string; createdAt: string };

export default function AuthMenu() {
  const [user, setUser] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data))
      .finally(() => setLoaded(true));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  }

  if (!loaded) return null; // 还没问完,先不显示(避免闪一下"登录")

  if (user) {
    return (
      <div className="auth-menu">
        <span className="auth-email" title={user.email}>
          {user.email}
        </span>
        <button type="button" className="auth-link" onClick={handleLogout}>
          退出
        </button>
      </div>
    );
  }

  return (
    <div className="auth-menu">
      <Link className="auth-link" href="/login">
        登录
      </Link>
      <Link className="auth-button" href="/register">
        注册
      </Link>
    </div>
  );
}
