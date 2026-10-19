
export type VodEpisode = {
  episodeNumber: number;
  title: string;
  sourceUrl: string;
  sourceName: string;
};

export type ParsedDrama = {
  sourceId: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  year: string;
  area: string;
  category: string;
  status: string;
  episodes: VodEpisode[];
};

type RawVodItem = {
  vod_id: string | number;
  vod_name: string;
  vod_pic?: string;
  vod_content?: string;
  vod_blurb?: string;
  vod_year?: string;
  vod_area?: string;
  vod_class?: string;
  vod_remarks?: string;
  vod_isend?: number;
  vod_play_from?: string;
  vod_play_url?: string;
};

type RawResponse = {
  code: number;
  list: RawVodItem[];
};

function makeSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 中文名称可能生成空字符串，使用来源 ID 保证唯一性。
  return slug || "drama";
}

function parseEpisodeGroup(
  value: string,
  sourceName: string
): VodEpisode[] {
  if (!value.trim()) return [];

  return value
    .split("#")
    .map((part) => {
      const separator = part.indexOf("$");

      if (separator < 0) return null;

      const title = part.slice(0, separator).trim();
      const sourceUrl = part.slice(separator + 1).trim();

      if (!title || !sourceUrl) return null;

      const match = title.match(/第\s*(\d+)\s*集/);
      if (!match) return null;

      const episodeNumber = Number(match[1]);

      let url: URL;
      try {
        url = new URL(sourceUrl);
      } catch {
        return null;
      }

      if (url.protocol !== "https:") return null;

      return {
        episodeNumber,
        title,
        sourceUrl,
        sourceName,
      };
    })
    .filter((item): item is VodEpisode => item !== null);
}

export function parseVodResponse(
  response: RawResponse
): ParsedDrama[] {
  if (response.code !== 1 || !Array.isArray(response.list)) {
    throw new Error("影视接口返回格式不正确");
  }

  return response.list.map((item) => {
    const sourceId = String(item.vod_id);
    const title = item.vod_name.trim();

    if (!sourceId || !title) {
      throw new Error("作品缺少 ID 或名称");
    }

    const sources = (item.vod_play_from ?? "").split("$$$");
    const groups = (item.vod_play_url ?? "").split("$$$");

    const episodes = groups.flatMap((group, index) => {
      const sourceName = sources[index]?.trim() || `source-${index + 1}`;

      return parseEpisodeGroup(group, sourceName);
    });

    // 相同集数可能存在多个播放源，保留各源记录。
    const seen = new Set<string>();
const uniqueEpisodes: VodEpisode[] = [];

for (const episode of episodes) {
  const key = `${episode.sourceName}:${episode.episodeNumber}`;

  if (seen.has(key)) {
    console.warn(
      `[重复集数] 作品：${title}，播放源：${episode.sourceName}，集数：${episode.episodeNumber}`
    );
    continue;
  }

  seen.add(key);
  uniqueEpisodes.push(episode);
}

    return {
      sourceId,
      slug: `vod-${sourceId}`,
      title,
      description: item.vod_content || item.vod_blurb || "",
      coverUrl: item.vod_pic || "",
      year: item.vod_year || "",
      area: item.vod_area || "",
      category: item.vod_class || "",
      status: item.vod_isend === 1 ? "completed" : "ongoing",
      episodes: uniqueEpisodes,
    };
  });
}
