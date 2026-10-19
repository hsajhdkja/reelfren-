// 合法片源批量导入:查重 → 验链 → 建剧挂集 → 生成向量
// 片单放在项目根目录的 batch-list.json,运行:npx tsx scripts/batch-import.ts
import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../lib/prisma";
import { embed } from "../lib/ai";

type EpisodeIn = { title: string; videoUrl: string };
type DramaIn = {
  title: string;
  category: string;
  description: string;
  poster?: string;
  tag?: string;
  episodes: EpisodeIn[];
};

// ---- 读取片单(项目根目录的 batch-list.json) ----
function loadList(): DramaIn[] {
  if (!fs.existsSync("batch-list.json")) {
    console.error("找不到 batch-list.json——请在项目根目录创建片单文件");
    process.exit(1);
  }
  try {
    const list = JSON.parse(fs.readFileSync("batch-list.json", "utf-8"));
    if (!Array.isArray(list) || list.length === 0) {
      console.error("batch-list.json 必须是非空的 JSON 数组");
      process.exit(1);
    }
    return list;
  } catch (err) {
    console.error("batch-list.json 解析失败(检查 JSON 格式/逗号/引号):", err);
    process.exit(1);
  }
}

// ---- 直链校验:HEAD 探测,失败退回 Range GET ----
async function checkVideo(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) {
      res = await fetch(url, {
        headers: { Range: "bytes=0-1" },
        redirect: "follow",
      });
    }
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    const size = Number(res.headers.get("content-length") ?? 0);
    // 视频类型,或 octet-stream,或有体积的文件
    return (
      type.startsWith("video") ||
      type.includes("octet-stream") ||
      size > 100000
    );
  } catch {
    return false;
  }
}

// ---- 语义素材(与 embed 脚本同一配方) ----
function material(d: { title: string; category: string; description: string }) {
  return `短剧《${d.title}》，类型：${d.category}题材。剧情简介：${d.description}`;
}

async function main() {
  const DATA = loadList();
  let created = 0;
  let skipped = 0;
  const failed: string[] = [];

  console.log(`片单共 ${DATA.length} 部,开始处理…\n`);

  for (const item of DATA) {
    // ---- 1.查重:同名剧跳过(幂等,重复跑安全) ----
    const exists = await prisma.drama.findFirst({
      where: { title: item.title },
    });
    if (exists) {
      console.log(`⏭ 已存在,跳过:${item.title}`);
      skipped++;
      continue;
    }

    // ---- 2.验链:任何一集链接不可用就整部跳过 ----
    let linksOk = true;
    for (const ep of item.episodes) {
      const ok = await checkVideo(ep.videoUrl);
      if (!ok) {
        console.log(`⛔ 链接不可用,整部跳过:${item.title}(${ep.videoUrl})`);
        linksOk = false;
        break;
      }
    }
    if (!linksOk) continue;

    // ---- 3.建剧 + 挂集(集数自动排列) ----
    const drama = await prisma.drama.create({
      data: {
        title: item.title,
        category: item.category,
        rating: "8.0",
        description: item.description,
        image: item.poster ?? "photo-1506794778202-cad84cf45f1d",
        tag: item.tag ?? "片源",
        published: true,
        episodes: {
          create: item.episodes.map((ep, index) => ({
            number: index + 1,
            title: ep.title,
            videoUrl: ep.videoUrl,
          })),
        },
      },
    });
    console.log(`✅ 已创建:${drama.title}(id=${drama.id},${item.episodes.length} 集)`);
    created++;
  }

  // ---- 4.批量生成语义向量(只给新剧生成,省 AI 调用) ----
  if (created > 0) {
    console.log("\n开始生成语义向量…");
    const pending = await prisma.drama.findMany({
      where: { embedding: null },
      select: { id: true, title: true, category: true, description: true },
    });
    for (const d of pending) {
      const vector = await embed(material(d));
      await prisma.drama.update({
        where: { id: d.id },
        data: { embedding: JSON.stringify(vector) },
      });
      console.log(`✅ 向量:${d.title}(${vector.length} 维)`);
    }
  }

  console.log(`\n📊 报告:新建 ${created} 部 | 跳过 ${skipped} 部 | 链接失效 ${failed.length} 部`);
  for (const f of failed) console.log(`  ⛔ ${f}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("导入失败:", err);
  process.exit(1);
});
