
import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./app/generated/prisma/client";

type VodEpisode = {
  episodeNumber: number;
  title: string;
  sourceUrl: string;
  sourceName: string;
};

type VodDrama = {
  sourceId: string;
  title: string;
  description: string;
  coverUrl: string;
  year: string;
  area: string;
  category: string;
  status: string;
  episodes: VodEpisode[];
};

function mapCategory(value: string): string {
  if (value.includes("爱情")) return "Romance";
  if (value.includes("复仇")) return "Revenge";
  if (value.includes("豪门")) return "Billionaire";
  return "Drama";
}

async function main() {
  // 默认只预演。只有添加 --write 参数才会真正写入。
  const writeMode = process.argv.includes("--write");
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("未读取到 DATABASE_URL，请检查项目根目录的 .env");
  }

  const dataPath = "./data/vod-page-1.normalized.json";

  if (!fs.existsSync(dataPath)) {
    throw new Error(`找不到数据文件：${dataPath}`);
  }

  const input = JSON.parse(
    fs.readFileSync(dataPath, "utf8"),
  ) as { dramas: VodDrama[] };

  if (!Array.isArray(input.dramas)) {
    throw new Error("数据文件格式错误：找不到 dramas 数组");
  }

  const url = new URL(raw);
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1";

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    connectionLimit: 5,
    connectTimeout: 15_000,
    ssl: isLocal
      ? undefined
      : {
          ca: fs.readFileSync("tidb-ca.pem"),
          rejectUnauthorized: true,
        },
  });

  const prisma = new PrismaClient({ adapter });

  try {
    console.log(
      writeMode
        ? "=== 正式导入模式 ==="
        : "=== 预演模式：不会写入数据库 ===",
    );
    console.log("数据库主机：", url.hostname);
    console.log("数据库名称：", decodeURIComponent(url.pathname.replace(/^\//, "")));

    const existing = await prisma.drama.findMany({
      select: { title: true },
    });

    const existingTitles = new Set(
      existing.map((item) => item.title.trim().toLowerCase()),
    );

    let newDramaCount = 0;
    let insertedDramaCount = 0;
    let skippedExisting = 0;
    let skippedNoEpisodes = 0;
    let invalidRecords = 0;
    let totalEpisodes = 0;

    for (const drama of input.dramas) {
      const title = drama.title?.trim() ?? "";
      const titleKey = title.toLowerCase();

      if (!title || title.length > 200) {
        console.log(`[跳过：作品标题无效] ${title || "(空标题)"}`);
        invalidRecords++;
        continue;
      }

      if (existingTitles.has(titleKey)) {
        console.log(`[跳过：作品已存在] ${title}`);
        skippedExisting++;
        continue;
      }

      if (!drama.episodes?.length) {
        console.log(`[跳过：没有分集] ${title}`);
        skippedNoEpisodes++;
        continue;
      }

      // 每集只保留一个来源，优先选择 jlm3u8。
      const episodesByNumber = new Map<number, VodEpisode>();

      for (const episode of drama.episodes) {
        if (
          !Number.isInteger(episode.episodeNumber) ||
          episode.episodeNumber < 1 ||
          !episode.title?.trim() ||
          episode.title.trim().length > 100 ||
          !episode.sourceUrl
        ) {
          invalidRecords++;
          continue;
        }

        let parsedUrl: URL;

        try {
          parsedUrl = new URL(episode.sourceUrl);
        } catch {
          invalidRecords++;
          continue;
        }

        if (
          parsedUrl.protocol !== "https:" ||
          episode.sourceUrl.length > 500
        ) {
          invalidRecords++;
          continue;
        }

        const previous = episodesByNumber.get(episode.episodeNumber);

        if (
          !previous ||
          (
            episode.sourceName === "jlm3u8" &&
            previous.sourceName !== "jlm3u8"
          )
        ) {
          episodesByNumber.set(episode.episodeNumber, {
            ...episode,
            title: episode.title.trim(),
          });
        }
      }

      const validEpisodes = [...episodesByNumber.values()].sort(
        (a, b) => a.episodeNumber - b.episodeNumber,
      );

      if (!validEpisodes.length) {
        console.log(`[跳过：没有有效分集] ${title}`);
        skippedNoEpisodes++;
        continue;
      }

      // 数据库 image 字段最长 200 字符。
      if (!drama.coverUrl || drama.coverUrl.length > 200) {
        console.log(`[跳过：封面地址无效或过长] ${title}`);
        invalidRecords++;
        continue;
      }

      try {
        const imageUrl = new URL(drama.coverUrl);
        if (imageUrl.protocol !== "https:") {
          console.log(`[跳过：封面不是 HTTPS 地址] ${title}`);
          invalidRecords++;
          continue;
        }
      } catch {
        console.log(`[跳过：封面地址格式错误] ${title}`);
        invalidRecords++;
        continue;
      }

      const category = mapCategory(drama.category || "");
      const tag = (drama.year || drama.status || "短剧").slice(0, 50);
      const description = drama.description || "";

      console.log(
        `[${writeMode ? "准备写入" : "预演新增"}] ${title} | 分类=${category} | 分集=${validEpisodes.length}`,
      );

      newDramaCount++;
      totalEpisodes += validEpisodes.length;

      if (writeMode) {
        // 一次创建作品及其分集；该作品创建失败时不会留下半套分集。
        await prisma.drama.create({
          data: {
            title,
            category,
            rating: "9.0",
            description,
            image: drama.coverUrl,
            tag,
            published: true,
            episodes: {
              create: validEpisodes.map((episode) => ({
                number: episode.episodeNumber,
                title: episode.title,
                videoUrl: episode.sourceUrl,
              })),
            },
          },
        });

        insertedDramaCount++;
        console.log(`[写入成功] ${title}`);
      }

      // 同一文件中再次出现相同标题时跳过。
      existingTitles.add(titleKey);
    }

    console.log("\n=== 汇总 ===");
    console.log("数据文件作品数：", input.dramas.length);
    console.log("导入前数据库作品数：", existing.length);
    console.log("本次新增作品数：", newDramaCount);
    console.log("本次新增分集数：", totalEpisodes);
    console.log("跳过已存在作品：", skippedExisting);
    console.log("跳过无分集作品：", skippedNoEpisodes);
    console.log("无效记录数：", invalidRecords);

    if (writeMode) {
      console.log("成功写入作品数：", insertedDramaCount);
      console.log("导入结束。原有作品和剧集未被删除或覆盖。");
    } else {
      console.log("\n当前仅为预演，没有写入任何数据。");
      console.log("确认数据库主机正确后，再使用 --write 正式导入。");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("导入脚本执行失败：");
  console.dir(error, { depth: null });
  process.exitCode = 1;
});
