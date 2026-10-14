"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // 拦下表单的"整页刷新"默认行为
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "登录失败");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" href="/">
          ← 返回首页
        </Link>
        <span className="section-kicker">WELCOME BACK</span>
        <h1>登录</h1>

        {error && <p className="auth-error">{error}</p>}

        <label className="auth-field">
          邮箱
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "登录中…" : "登录"}
        </button>

        <p className="auth-switch">
          还没有账号？<Link href="/register">去注册</Link>
        </p>
      </form>
    </main>
  );
}
