import Link from "next/link";
import { notFound } from "next/navigation";
import { posterUrl } from "@/data/dramas";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "@/components/FavoriteButton";

// 关闭"瞬时流式渲染"= 允许整页阻塞式渲染:每次访问现查数据库,数据实时
export const instant = false;

export default async function DramaDetailPage({
  params,
}: PageProps<"/dramas/[id]">) {

  // Next.js 16:params 是 Promise,必须 await
  const { id } = await params;
  const dramaId = Number(id);

  // 参数校验:不是正整数直接 404
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    notFound();
  }

  // 查库:剧 + 它的所有集(按集数排序)
  const row = await prisma.drama.findUnique({
    where: { id: dramaId },
    include: { episodes: { orderBy: { number: "asc" } } },
  });
  if (!row) {
    notFound();
  }

  // 整形:让下面的 JSX 不用改一个字(episodes=总数,episodeList=明细)
  const { episodes, ...dramaData } = row;
  const drama = {
    ...dramaData,
    episodes: episodes.length,
    episodeList: episodes,
  };

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

          <div className="detail-actions">
            <FavoriteButton dramaId={drama.id} />
          </div>
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
