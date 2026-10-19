"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthMenu from "@/components/AuthMenu";
import { categories, posterUrl, type Drama } from "@/data/dramas";

// 列表接口返回的数据形状(和 route.ts 里的返回结构对应)
type ListResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: Drama[];
};

const PAGE_SIZE = 8;

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // "再跑一次"计数器:点重试按钮时 +1,触发 useEffect 重新执行
  const [refreshTick, setRefreshTick] = useState(0);
  const [aiMode, setAiMode] = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<number, string>>({});

  useEffect(() => {
    // 防抖:停手 300 毫秒才真正发请求
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (aiMode && keyword.trim()) {
          // AI 语义搜索(流式):先收到剧目,再逐字收到推荐理由
          const response = await fetch(
            `/api/search/ai/stream?q=${encodeURIComponent(keyword.trim())}`
          );
          if (!response.ok || !response.body) {
            throw new Error("AI 搜索失败");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE 一条事件 = 一个空行分隔的块
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? ""; // 最后一块可能不完整,留下次拼

            for (const block of blocks) {
              let event = "message";
              const dataLines: string[] = [];
              for (const line of block.split("\n")) {
                if (line.startsWith("event:")) event = line.slice(6).trim();
                if (line.startsWith("data:"))
                  dataLines.push(line.slice(5).trim());
              }
              if (dataLines.length === 0) continue;
              const payload = JSON.parse(dataLines.join("\n"));

              if (event === "items") {
                // 剧目先到:卡片立刻出现(理由区暂空)
                setAiReasons({});
                setResult({
                  total: payload.items.length,
                  page: 1,
                  pageSize: payload.items.length || 1,
                  totalPages: 1,
                  items: payload.items,
                });
              }
              if (event === "reason-delta") {
                // 理由逐字到达:往对应卡片上"打字"
                setAiReasons((prev) => ({
                  ...prev,
                  [payload.id]: (prev[payload.id] ?? "") + payload.text,
                }));
              }
              if (event === "error") {
                throw new Error(payload.message ?? "AI 搜索失败");
              }
            }
          }
        } else {
          // 原有关键词/分类搜索
          const params = new URLSearchParams({
            keyword: keyword.trim(),
            category,
            page: String(page),
            pageSize: String(PAGE_SIZE),
          });
          const response = await fetch(`/api/dramas?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message ?? "请求失败");
          }
          setAiReasons({});
          setResult(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "网络错误，请稍后再试");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    // 清理:下一次 effect 跑之前,把没到点的计时器作废(这就是防抖的另一半)
    return () => clearTimeout(timer);
  }, [keyword, category, page, refreshTick, aiMode]);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ReelFren 首页">
          <span className="brand-icon">R</span>
          <span>reel<span className="brand-accent">fren</span></span>
        </a>

        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1); // 新搜索永远从第 1 页开始
            }}
            placeholder="搜索短剧，或描述你想看的..."
            aria-label="搜索短剧"
          />
          {keyword && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setKeyword("");
                setPage(1);
              }}
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
        </label>

        <AuthMenu />
      </header>

      {/* 精简横幅:一句话 + 品牌,不再占半屏 */}
      <section className="hero-slim" id="home">
        <div>
          <span className="section-kicker">REELFREN</span>
          <h1>小剧集，大情绪</h1>
          <p>海量短剧 · 随时开启下一段故事</p>
        </div>
      </section>

      <section className="content-section" id="discover">
        {/* 分类 Tab + AI 开关 + 结果数:一行三件事,滚动吸顶 */}
        <div className="discover-tabs">
          <div className="category-row">
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`category-button ${
                  category === item.value ? "category-active" : ""
                }`}
                onClick={() => {
                  setCategory(item.value);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="ai-toggle">
            <input
              type="checkbox"
              checked={aiMode}
              onChange={(e) => {
                setAiMode(e.target.checked);
                setPage(1);
              }}
            />
            ✨ AI
          </label>
          <span className="result-count">
            {result
              ? aiMode
                ? `✨ ${result.total} 部`
                : `${result.total} 部`
              : "…"}
          </span>
        </div>

        {isLoading ? (
          // 骨架屏:6 个闪烁的占位卡
          <div className="drama-grid">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <span>⚠</span>
            <h3>出错了</h3>
            <p>{error}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setRefreshTick((tick) => tick + 1)}
            >
              重试
            </button>
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="drama-grid" id="popular">
              {result.items.map((drama) => (
                <Link
                  key={drama.id}
                  href={`/dramas/${drama.id}`}
                  className="drama-card"
                >
                  <div className="drama-poster">
                    <img
                      src={posterUrl(drama.image)}
                      alt={drama.title}
                      loading="lazy"
                    />
                    <span className="drama-tag">{drama.tag}</span>
                    <span className="episode-count">{drama.episodes} 集</span>

                    {/* 底部渐变遮罩:标题和评分压在海报上(红果式) */}
                    <div className="poster-shade">
                      <h3>{drama.title}</h3>
                      <span className="rating">★ {drama.rating}</span>
                      {aiMode && aiReasons[drama.id] && (
                        <p className="poster-reason">
                          ✨ {aiReasons[drama.id]}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ◀ 上一页
              </button>
              <span className="page-info">
                第 {page} / {result.totalPages} 页 · 共 {result.total} 部
              </span>
              <button
                type="button"
                className="secondary-button"
                disabled={page >= result.totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页 ▶
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span>⌕</span>
            <h3>没有找到相关短剧</h3>
            <p>试试其他关键词或切换分类。</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setKeyword("");
                setCategory("All");
                setPage(1);
              }}
            >
              查看全部短剧
            </button>
          </div>
        )}
      </section>

      <section className="bottom-banner">
        <div>
          <span className="section-kicker">YOUR STORY STARTS HERE</span>
          <h2>下一段精彩，现在开始。</h2>
          <p>探索更多故事，发现属于你的下一部短剧。</p>
        </div>
        <a href="#discover" className="primary-button">开始探索 →</a>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">R</span>
          <span>reel<span className="brand-accent">fren</span></span>
        </a>
        <p>短剧灵感空间 · 演示项目</p>
        <span>© 2026 ReelFren-style Demo</span>
      </footer>
    </main>
  );
}
