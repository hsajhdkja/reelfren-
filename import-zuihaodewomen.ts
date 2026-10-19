
import "dotenv/config";
import { prisma } from "./lib/prisma";

const episodes = [
  "https://jimaoys94.com/public/playback/667fbd15a8e007ca5bdb9903e256591f/smart.m3u8",
  "https://jimaoys94.com/public/playback/41073a1ba9cd7ea0626fc717ee072719/smart.m3u8",
  "https://jimaoys94.com/public/playback/565a6ebfa98c779842a91f0a58876c1e/smart.m3u8",
  "https://jimaoys94.com/public/playback/1b668db3233e8ad1c565ce9e99be5233/smart.m3u8",
  "https://jimaoys94.com/public/playback/5548d9eafaff34ea396fbaad46514bc5/smart.m3u8",
  "https://jimaoys94.com/public/playback/39672f9a5bbe5856af88212f66961c11/smart.m3u8",
  "https://jimaoys94.com/public/playback/7595b51e472185b133ecd0d5d8cd2059/smart.m3u8",
  "https://jimaoys94.com/public/playback/63bf5bd02174610bed0f4639f30b6cea/smart.m3u8",
  "https://jimaoys94.com/public/playback/9782cfd4ac33f20efb071d31a7d55a2c/smart.m3u8",
  "https://jimaoys94.com/public/playback/a1e2da722c1cc297cfac02025a5edacb/smart.m3u8",
  "https://jimaoys94.com/public/playback/f1484064a05158a9a8cfd66b6bec2d25/smart.m3u8",
  "https://jimaoys94.com/public/playback/cd1611a6458c917924ac45b8039ed1cb/smart.m3u8",
  "https://jimaoys94.com/public/playback/7eacac2c4dc3caa831e06590dcf620e9/smart.m3u8",
  "https://jimaoys94.com/public/playback/60fcaf5337506173204b5ea6fb914c61/smart.m3u8",
  "https://jimaoys94.com/public/playback/bb377243437454c2cae50b6189bf5df1/smart.m3u8",
  "https://jimaoys94.com/public/playback/29e1700ba640fb10a59b58e0a5f8b8df/smart.m3u8",
  "https://jimaoys94.com/public/playback/77904baec9ee97492179cf2aac677584/smart.m3u8",
  "https://jimaoys94.com/public/playback/29f481096e4ad3695b95cd1dc61c2182/smart.m3u8",
  "https://jimaoys94.com/public/playback/bf8f487b175f7529d7dff9792e6edd4d/smart.m3u8",
  "https://jimaoys94.com/public/playback/bfb183d145cf25a46aa054a521dd342a/smart.m3u8",
  "https://jimaoys94.com/public/playback/0a7f1a7bd2230d8cde3574efd6175cee/smart.m3u8",
  "https://jimaoys94.com/public/playback/248d5638c546f48da034b10d55510ecd/smart.m3u8",
  "https://jimaoys94.com/public/playback/9b716b6c0e363cdaa46b82cd493ec856/smart.m3u8",
  "https://jimaoys94.com/public/playback/261ab5bb667a191aedad77c427dc4e62/smart.m3u8",
];

async function main() {
  const title = "最好的我们";

  // 检查是否已经导入，防止重复创建
  const existing = await prisma.drama.findFirst({
    where: { title },
    include: { _count: { select: { episodes: true } } },
  });

  if (existing) {
    console.log(`剧集《${title}》已经存在，ID：${existing.id}`);
    console.log(`现有集数：${existing._count.episodes}`);
    console.log("为避免重复或覆盖，本次没有修改数据库。");
    return;
  }

  const drama = await prisma.drama.create({
    data: {
      title,
      category: "Romance",
      rating: "8.0",
      description:
        "因非典的缘故，中考难度降低，耿耿意外考入重点高中，并在那里结识了学霸余淮。青涩美好的学生时代，留下了难忘的回忆。",
      image:
        "https://img1.doubanio.com/view/photo/m_ratio_poster/public/p2299407300.webp",
      tag: "剧情 / 爱情",
      published: true,
      episodes: {
        create: episodes.map((videoUrl, index) => ({
          number: index + 1,
          title: `第 ${index + 1} 集`,
          videoUrl,
        })),
      },
    },
    include: {
      _count: { select: { episodes: true } },
    },
  });

  console.log("导入成功！");
  console.log(`剧名：${drama.title}`);
  console.log(`剧集 ID：${drama.id}`);
  console.log(`导入集数：${drama._count.episodes}`);
  console.log(`详情页：/dramas/${drama.id}`);
}

main()
  .catch((error) => {
    console.error("导入失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
