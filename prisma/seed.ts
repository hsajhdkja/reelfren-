// 数据搬家脚本:把 data/dramas.ts 的数据灌进数据库
// 运行:npx prisma db seed(可重复执行,结果一致)
import { prisma } from "../lib/prisma";
import { dramas } from "../data/dramas";

async function main() {
  // ---- 1. 先清空(保证幂等:重复跑不会翻倍) ----
  await prisma.episode.deleteMany();
  await prisma.drama.deleteMany();

  // ---- 2. 逐部搬入:建剧时嵌套创建它所有的集 ----
  for (const drama of dramas) {
    const { id, episodes, episodeList, ...dramaData } = drama;

    await prisma.drama.create({
      data: {
        ...dramaData,
        episodes: {
          create: episodeList,
        },
      },
    });
    console.log(`已搬入:${drama.title}(${episodeList.length} 集)`);
  }

  // ---- 3. 验收报告 ----
  const dramaCount = await prisma.drama.count();
  const episodeCount = await prisma.episode.count();
  console.log(`\n搬运完成:共 ${dramaCount} 部剧、${episodeCount} 集`);
}

main()
  .catch((err) => {
    console.error("搬家失败:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
