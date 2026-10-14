"use client";
import AuthMenu from "@/components/AuthMenu";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categories, posterUrl, type Drama } from "@/data/dramas";

// 列表接口返回的数据形状(和 route.ts 里的返回结构对应)
type ListResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: Drama[];
};

const PAGE_SIZE = 6;

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
          // AI 语义搜索:一句话描述 → top3 + 推荐理由
          const response = await fetch(
            `/api/search/ai?q=${encodeURIComponent(keyword.trim())}`
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message ?? "AI 搜索失败");
          }
          setAiReasons(
            Object.fromEntries(
              data.items.map((d: { id: number; reason: string }) => [
                d.id,
                d.reason,
              ])
            )
          );
          setResult({
            total: data.items.length,
            page: 1,
            pageSize: data.items.length || 1,
            totalPages: 1,
            items: data.items,
          });
        } else {
          // 原有关键词/分类搜索(一行没变,只是挪进了 else)
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
        <a className="brand" href="#" aria-label="ReelFren 首页">
          <span className="brand-icon">R</span>
          <span>reel<span className="brand-accent">fren</span></span>
        </a>

        <nav className="main-nav">
          <a className="nav-active" href="#home">首页</a>
          <a href="#discover">发现短剧</a>
          <a href="#popular">热门榜单</a>
        </nav>

        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1); // 新搜索永远从第 1 页开始
            }}
            placeholder="搜索短剧..."
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

      <section className="hero" id="home">
        <div className="hero-backdrop" />
        <div className="hero-content">
          <div className="eyebrow">
            <span className="live-dot" />
            YOUR NEXT OBSESSION
          </div>

          <h1>
            Small Episodes.
            <br />
            <span>Big Emotions.</span>
          </h1>

          <p>
            发现让你欲罢不能的精彩短剧。
            <br />
            随时开启下一段故事。
          </p>

          <div className="hero-actions">
            <a href="#discover" className="primary-button">
              探索短剧 <span>→</span>
            </a>
            <a href="#popular" className="secondary-button">
              浏览热门
            </a>
          </div>

          <div className="hero-stats">
            <div><strong>每日</strong><span>发现新故事</span></div>
            <div><strong>随时</strong><span>开启精彩剧情</span></div>
            <div><strong>精彩</strong><span>短剧推荐</span></div>
          </div>
        </div>

        <div className="hero-art">
          <div className="hero-poster hero-poster-back">
            <img
              src={posterUrl("photo-1534528741775-53994a69daeb")}
              alt=""
            />
          </div>
          <Link href="/dramas/1" className="hero-poster hero-poster-front">
            <img
              src={posterUrl("photo-1516589178581-6cd7833ae3b2")}
              alt=""
            />
            <div className="poster-overlay">
              <span>EDITOR&apos;S PICK</span>
              <strong>The Last Promise</strong>
              <small>Romance · 68 Episodes</small>
            </div>
          </Link>
          <div className="floating-note">
            <span className="note-star">★</span>
            <div><strong>9.2 / 10</strong><small>观众推荐</small></div>
          </div>
        </div>
      </section>

      <section className="content-section" id="discover">
        <div className="section-heading">
          <div>
            <span className="section-kicker">FIND YOUR STORY</span>
            <h2>发现精彩短剧</h2>
            <p>总有一个故事，让你忍不住继续看下去。</p>
          </div>
          <span className="result-count">
         {result
              ? aiMode
                ? `✨ AI 推荐 ${result.total} 部`
                : `${result.total} 部短剧`
              : "…"}
          </span>
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
          ✨ AI 语义搜索
        </label>
        <div className="category-row" aria-label="短剧分类">
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

        {isLoading ? (
          <div className="empty-state">
            <span>⏳</span>
            <h3>加载中…</h3>
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
                    <span className="card-play" aria-hidden="true">▶</span>
                  </div>
                  <div className="drama-info">
                    <div className="drama-title-row">
                      <h3>{drama.title}</h3>
                      <span className="rating">★ {drama.rating}</span>
                    </div>
                    <p>{drama.category} <span>·</span> {drama.episodes} 集</p>
                    {aiMode && aiReasons[drama.id] && (
                      <p className="card-reason">
                        ✨ {aiReasons[drama.id]}
                      </p>
                    )}
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
              <span className="page-info">第 {page} / {result.totalPages} 页 · 共 {result.total} 部</span>
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
