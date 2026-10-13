import Link from "next/link";
import { notFound } from "next/navigation";
import { dramas, getDramaById, posterUrl } from "@/data/dramas";

// 预生成静态页面:8 部剧各生成一个,访客请求时不用现算(架构文档 5.3 的"静态化")
export function generateStaticParams() {
  return dramas.map((drama) => ({ id: String(drama.id) }));
}

// Next.js 16:params 是 Promise,必须 await;类型用全局助手 PageProps(不用 import)
export default async function DramaDetailPage({
  params,
}: PageProps<"/dramas/[id]">) {
  const { id } = await params;
  const drama = getDramaById(Number(id)); // 网址里的编号是文字,转成数字再查

  // 编号不存在(比如 /dramas/999)→ 渲染 404 页面,后面代码不再执行
  if (!drama) {
    notFound();
  }

  return (
    <main className="site-shell">
      <nav className="detail-topbar">
        <Link className="back-link" href="/">
          ← 返回首页
        </Link>
      </nav>

      <section className="detail-hero">
        <img
          className="detail-poster"
          src={posterUrl(drama.image)}
          alt={drama.title}
        />
        <div className="detail-info">
          <span className="section-kicker">{drama.tag}</span>
          <h1>{drama.title}</h1>
          <div className="detail-meta">
            <span>★ {drama.rating}</span>
            <span>{drama.category}</span>
            <span>共 {drama.episodes} 集</span>
          </div>
          <p className="detail-desc">{drama.description}</p>
        </div>
      </section>

      <section className="episode-section">
        <h2>剧集列表</h2>
        <div className="episode-grid">
          {drama.episodeList.map((episode) => (
            <Link
               key={episode.number}
               href={`/dramas/${drama.id}/play/${episode.number}`}
               className="episode-item"
            >
              {episode.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
