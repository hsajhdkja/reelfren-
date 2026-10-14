// 给全部短剧生成语义向量并存库
// 运行:npx tsx scripts/embed-dramas.ts
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace("/", ""),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

// 调向量接口:一段文字 → 一串数字
async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${process.env.LLM_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL,
      input: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`向量接口失败 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}

// 分类的中文映射(语义素材用中文,和用户的中文搜索词更"接近")
const CN_CATEGORY: Record<string, string> = {
  Romance: "爱情",
  Revenge: "复仇",
  Billionaire: "豪门",
  Drama: "剧情",
};

async function main() {
  const dramas = await prisma.drama.findMany();
  console.log(`共 ${dramas.length} 部剧需要生成向量`);

  for (const drama of dramas) {
    // 语义素材:标题 + 中文分类 + 简介(最能代表"这部剧讲什么"的部分)
    const cnCategory = CN_CATEGORY[drama.category] ?? drama.category;
    const text = `短剧《${drama.title}》，类型：${cnCategory}题材。剧情简介：${drama.description}`;
    const vector = await embed(text);

    await prisma.drama.update({
      where: { id: drama.id },
      data: { embedding: JSON.stringify(vector) }, // 数字串转成文字存库
    });
    console.log(`✅ ${drama.title} → ${vector.length} 维`);

    await new Promise((r) => setTimeout(r, 300)); // 停 0.3 秒,对免费接口温柔一点
  }

  console.log("\n🎬 全部完成!每部剧都有了语义坐标");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("失败:", err);
  process.exit(1);
});
