import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Player from "./Player";

// 预生成所有播放页:从数据库读出 剧×集 的全部组合
export async function generateStaticParams() {
  const rows = await prisma.drama.findMany({
    include: { episodes: true },
  });
  return rows.flatMap((drama) =>
    drama.episodes.map((episode) => ({
      id: String(drama.id),
      episode: String(episode.number),
    }))
  );
}

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

  // 上一集/下一集:在整条剧集列表里找邻居
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
    <main className="site-shell">
      <nav className="detail-topbar">
        <Link className="back-link" href={`/dramas/${drama.id}`}>
          ← 返回详情页
        </Link>
      </nav>

      <section className="play-section">
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

        <div className="episode-grid play-episode-grid">
          {drama.episodeList.map((item) => (
            <Link
              key={item.number}
              href={`/dramas/${drama.id}/play/${item.number}`}
              className={`episode-item ${
                item.number === episodeNumber ? "episode-active" : ""
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
