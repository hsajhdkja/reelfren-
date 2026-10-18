"use client";

// AI 推荐助手:历史存服务端,刷新不丢
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 进页面:检查登录 + 从云端拉取历史对话
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => setLoggedIn(r.ok))
      .finally(() => setChecked(true));
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) =>
        setMessages(
          (d.items ?? []).filter(
            (m: Msg) => m.role === "user" || m.role === "assistant"
          )
        )
      );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "请求失败");
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          tools: data.toolsUsed,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "出错了，请稍后再试",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // 门禁:未登录 → 引导登录
  if (checked && !loggedIn) {
    return (
      <main className="site-shell me-page">
        <div className="auth-card">
          <h1>请先登录</h1>
          <p className="auth-switch">
            <Link href="/login">去登录</Link> · <Link href="/">回首页</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell chat-page">
      <header className="chat-header">
        <h1>🤖 AI 推荐助手</h1>
        <p>对话历史已云端保存，换个设备也记得你</p>
      </header>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`bubble bubble-${msg.role}`}>
            <div className="bubble-text">{msg.content}</div>
            {msg.tools && msg.tools.length > 0 && (
              <div className="tools-chip">
                🔍 已搜索短剧（{msg.tools.join("、")}）
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bubble bubble-ai bubble-loading">思考中…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-inputbar" onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你想看的短剧..."
          aria-label="输入消息"
        />
        <button
          type="submit"
          className="primary-button"
          disabled={loading || !input.trim()}
        >
          发送
        </button>
      </form>
    </main>
  );
}
