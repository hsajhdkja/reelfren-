"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "注册失败");
      }
      // 注册成功 → 去登录页用新账号登录(自动登录以后可以加)
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="back-link" href="/">
          ← 返回首页
        </Link>
        <span className="section-kicker">JOIN REELFREN</span>
        <h1>注册</h1>

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
          密码(至少 8 位)
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "注册中…" : "注册"}
        </button>

        <p className="auth-switch">
          已有账号？<Link href="/login">去登录</Link>
        </p>
      </form>
    </main>
  );
}
