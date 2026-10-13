// 数据搬家脚本:把 data/dramas.ts 的数据灌进数据库
// 运行方式:npx prisma db seed(可重复执行,结果一致)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";
import { dramas } from "../data/dramas";

// ---- 连接数据库(从 .env 的连接串里拆出各要素) ----
const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname, // localhost
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username), // root
  password: decodeURIComponent(url.password),
  database: url.pathname.replace("/", ""), // reelfren
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // ---- 1. 先清空(保证幂等:重复跑不会翻倍) ----
  // 有外键的表先删:先删集,再删剧(顺序反了会被外键拦住)
  await prisma.episode.deleteMany();
  await prisma.drama.deleteMany();

  // ---- 2. 逐部搬入:建剧时嵌套创建它所有的集 ----
  for (const drama of dramas) {
    // 拆包:id 不用(自增)、episodes 总数不用(数据库里靠统计得出)、episodeList 单独用
    const { id, episodes, episodeList, ...dramaData } = drama;

    await prisma.drama.create({
      data: {
        ...dramaData,
        episodes: {
          create: episodeList, // 嵌套创建:外键 dramaId 自动填好
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
    await prisma.$disconnect(); // 用完断开连接,好习惯
  });
