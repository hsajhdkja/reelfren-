import Link from "next/link";
import { notFound } from "next/navigation";
import { posterUrl } from "@/data/dramas";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "@/components/FavoriteButton";

// 构建期预渲染所有已上架的剧;之后导入的新剧走按需动态渲染
export async function generateStaticParams() {
  const rows = await prisma.drama.findMany({
    where: { published: true },
    select: { id: true },
  });
  return rows.map((row) => ({ id: String(row.id) }));
}

export default async function DramaDetailPage({
  params,
}: PageProps<"/dramas/[id]">) {
  const { id } = await params;
  const dramaId = Number(id);

  if (!Number.isInteger(dramaId) || dramaId < 1) {
    notFound();
  }

  const row = await prisma.drama.findUnique({
    where: { id: dramaId },
    include: { episodes: { orderBy: { number: "asc" } } },
  });
  if (!row) {
    notFound();
  }

  const { episodes, ...dramaData } = row;
  const drama = {
    ...dramaData,
    episodes: episodes.length,
    episodeList: episodes,
  };

  return (
    <main className="site-shell detail-shell">
      {/* 氛围层:海报放大铺满顶部,压暗+模糊,向下渐变融入页面 */}
      <div className="detail-backdrop">
        <img src={posterUrl(drama.image)} alt="" />
        <div className="detail-backdrop-shade" />
      </div>

      <div className="detail-body">
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
              <Link
                className="primary-button detail-play"
                href={`/dramas/${drama.id}/play/1`}
              >
                ▶ 立即播放
              </Link>
              <FavoriteButton dramaId={drama.id} />
            </div>
          </div>
        </section>

        <section className="episode-section">
          <h2>选集</h2>
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
      </div>
    </main>
  );
}
