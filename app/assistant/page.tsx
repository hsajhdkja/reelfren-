"use client";

// AI 推荐助手:多轮对话,显示工具调用过程
import { useEffect, useRef, useState, type FormEvent } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: string[]; // 这条回复用了哪些工具(显示"已搜索"用)
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息到达时自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    // 带上全部历史 = 多轮会话记忆(AI 记得之前聊过什么)
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages(history); // 立刻显示用户的话
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "请求失败");
      }
      setMessages([
        ...history,
        {
          role: "assistant",
          content: data.reply,
          tools: data.toolsUsed,
        },
      ]);
    } catch (err) {
      setMessages([
        ...history,
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

  return (
    <main className="site-shell chat-page">
      <header className="chat-header">
        <h1>🤖 AI 推荐助手</h1>
        <p>描述你想看的，我来帮你找（支持多轮对话）</p>
      </header>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>👋 试试这样问我：</p>
            <p>"想看女主复仇的剧" / "有什么评分高的豪门剧"</p>
          </div>
        )}

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
