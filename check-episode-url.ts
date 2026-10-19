
import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./app/generated/prisma/client";

async function main() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("未读取到 DATABASE_URL");
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
    connectionLimit: 3,
    ssl: isLocal
      ? undefined
      : {
          ca: fs.readFileSync("tidb-ca.pem"),
          rejectUnauthorized: true,
        },
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const drama = await prisma.drama.findFirst({
      where: { title: "本宫要离职" },
      include: {
        episodes: {
          orderBy: { number: "asc" },
          take: 3,
        },
      },
    });

    if (!drama) {
      console.log("数据库中找不到《本宫要离职》");
      return;
    }

    console.log("作品：", drama.title);
    console.log("剧集数：", await prisma.episode.count({
      where: { dramaId: drama.id },
    }));

    for (const episode of drama.episodes) {
      console.log(`第 ${episode.number} 集：${episode.title}`);
      console.log("播放地址：", episode.videoUrl);
      console.log(
        "地址格式：",
        episode.videoUrl.endsWith(".m3u8")
          ? "M3U8"
          : episode.videoUrl.endsWith(".mp4")
            ? "MP4"
            : "其他或带参数的地址",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("检查失败：", error);
  process.exitCode = 1;
});
