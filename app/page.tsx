
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { dramas, categories, posterUrl } from "@/data/dramas";


export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("All");
  

  const filteredDramas = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return dramas.filter((drama) => {
      const matchesCategory =
        category === "All" || drama.category === category;

      const matchesKeyword =
        !query ||
        drama.title.toLowerCase().includes(query) ||
        drama.description.toLowerCase().includes(query) ||
        drama.category.toLowerCase().includes(query);

      return matchesCategory && matchesKeyword;
    });
  }, [keyword, category]);

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
            }}
            placeholder="搜索短剧..."
            aria-label="搜索短剧"
          />
          {keyword && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setKeyword("")}
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
        </label>
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
          <div className="hero-poster hero-poster-front">
            <img
              src={posterUrl("photo-1516589178581-6cd7833ae3b2")}
              alt=""
            />
            <div className="poster-overlay">
              <span>EDITOR&apos;S PICK</span>
              <strong>The Last Promise</strong>
              <small>Romance · 68 Episodes</small>
            </div>
          </div>
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
          <span className="result-count">{filteredDramas.length} 部短剧</span>
        </div>

        <div className="category-row" aria-label="短剧分类">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`category-button ${
                category === item.value ? "category-active" : ""
              }`}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredDramas.length > 0 ? (
          <div className="drama-grid" id="popular">
            {filteredDramas.map((drama) => (
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
                </div>
              </Link>
            ))}
          </div>
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
