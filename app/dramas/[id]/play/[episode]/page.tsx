import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Player from "./Player";

// 请求时渲染:每次访问现查数据库(数据实时)
export const instant = false;

export default async function PlayPage({
  params,
}: PageProps<"/dramas/[id]/play/[episode]">) {
  const { id, episode: episodeParam } = await params;
  const dramaId = Number(id);
  const episodeNumber = Number(episodeParam);

  if (!Number.isInteger(dramaId) || dramaId < 1) notFound();
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) notFound();

  const row = await prisma.drama.findUnique({
    where: { id: dramaId },
    include: { episodes: { orderBy: { number: "asc" } } },
  });
  if (!row) notFound();

  const episode = row.episodes.find((item) => item.number === episodeNumber);
  if (!episode) notFound();

  const index = row.episodes.findIndex(
    (item) => item.number === episodeNumber
  );
  const prevNumber = index > 0 ? row.episodes[index - 1].number : null;
  const nextNumber =
    index < row.episodes.length - 1 ? row.episodes[index + 1].number : null;

  const drama = {
    id: row.id,
    title: row.title,
    episodeList: row.episodes,
  };

  return (
    <main className="site-shell play-shell">
      <nav className="detail-topbar">
        <Link className="back-link" href={`/dramas/${drama.id}`}>
          ← 返回详情页
        </Link>
      </nav>

      <div className="play-layout">
        {/* 左:播放器 + 标题 */}
        <section className="play-main">
          <Player
            dramaId={drama.id}
            episode={episode}
            prevNumber={prevNumber}
            nextNumber={nextNumber}
            total={drama.episodeList.length}
          />

          <div className="play-info">
            <span className="section-kicker">{drama.title}</span>
            <h1>{episode.title}</h1>
          </div>
        </section>

        {/* 右:选集侧边栏(吸顶、独立滚动) */}
        <aside className="ep-side">
          <h2>选集(共 {drama.episodeList.length} 集)</h2>
          <div className="ep-side-list">
            {drama.episodeList.map((item) => (
              <Link
                key={item.number}
                href={`/dramas/${drama.id}/play/${item.number}`}
                className={`ep-side-item ${
                  item.number === episodeNumber ? "episode-active" : ""
                }`}
              >
                <span>第 {item.number} 集</span>
                <span className="ep-side-name">{item.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
