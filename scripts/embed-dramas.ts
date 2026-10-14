// 给全部短剧生成语义向量并存库
// 运行:npx tsx scripts/embed-dramas.ts
import { embed } from "../lib/ai";
import { prisma } from "../lib/prisma";

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
      data: { embedding: JSON.stringify(vector) },
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
