import Link from "next/link";
import { notFound } from "next/navigation";
import { dramas, getDramaById } from "@/data/dramas";
import Player from "./Player";

// 预生成所有播放页:8 部剧 × 各自全部集数,组合出所有网址
export function generateStaticParams() {
  return dramas.flatMap((drama) =>
    drama.episodeList.map((episode) => ({
      id: String(drama.id),
      episode: String(episode.number),
    }))
  );
}

export default async function PlayPage({
  params,
}: PageProps<"/dramas/[id]/play/[episode]">) {
  const { id, episode: episodeParam } = await params;
  const drama = getDramaById(Number(id));
  if (!drama) notFound();

  const episodeNumber = Number(episodeParam);
  const episode = drama.episodeList.find(
    (item) => item.number === episodeNumber
  );
  if (!episode) notFound();

  // 算出上一集/下一集的编号;没有就是 null(界面据此显示"不可点")
  const prevNumber = episodeNumber > 1 ? episodeNumber - 1 : null;
  const nextNumber =
    episodeNumber < drama.episodeList.length ? episodeNumber + 1 : null;

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
