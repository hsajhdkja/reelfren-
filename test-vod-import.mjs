
import fs from "node:fs/promises";
import path from "node:path";
import JSONbigFactory from "json-bigint";
import { parseVodResponse } from "./lib/parse-vod.ts";

const JSONbig = JSONbigFactory({ storeAsString: true });

const API_URL = process.env.VOD_API_URL;
const PAGE_PARAM = process.env.VOD_PAGE_PARAM || "pg";
const PAGE = 1;
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  return JSONbig.parse(text);
}

async function main() {
  if (!API_URL) {
    throw new Error("请先设置 VOD_API_URL 环境变量。");
  }

  const listUrl = new URL(API_URL);
  listUrl.searchParams.set("ac", "list");
  listUrl.searchParams.set(PAGE_PARAM, String(PAGE));

  console.log("正在请求第一页作品列表……");

  const listResponse = await fetchJson(listUrl);

  if (listResponse.code !== 1 || !Array.isArray(listResponse.list)) {
    throw new Error("作品列表返回格式不正确。");
  }

  const list = listResponse.list;
  console.log(`列表返回 ${list.length} 部作品。`);

  const dramas = [];
  const failures = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const sourceId = String(item.vod_id ?? "").trim();

    if (!sourceId) {
      failures.push({
        title: item.vod_name || "未知作品",
        reason: "缺少 vod_id",
      });
      continue;
    }

    console.log(`正在处理第 ${i + 1}/${list.length} 部：${item.vod_name}`);
    console.log(`  作品 ID：${sourceId}`);

    try {
      const detailUrl = new URL(API_URL);
      detailUrl.searchParams.set("ac", "detail");
      detailUrl.searchParams.set("ids", sourceId);

      const detailResponse = await fetchJson(detailUrl);

      if (
        Number(detailResponse.code) !== 1 ||
        !Array.isArray(detailResponse.list) ||
        detailResponse.list.length === 0
      ) {
        throw new Error("详情接口没有返回作品数据");
      }

      const detail = detailResponse.list[0];
      const detailId = String(detail.vod_id ?? "");

      if (detailId !== sourceId) {
        throw new Error(
          `详情 ID 不匹配：列表 ${sourceId}，详情 ${detailId}`
        );
      }

      if (!detail.vod_play_url) {
        throw new Error("详情中没有 vod_play_url");
      }

      const parsed = parseVodResponse({
        code: Number(detailResponse.code),
        list: [detail],
      });

      if (parsed.length !== 1) {
        throw new Error("解析结果数量不正确");
      }

      dramas.push(parsed[0]);

      console.log(
        `  成功：${parsed[0].title}，${parsed[0].episodes.length} 条分集记录`
      );
    } catch (error) {
      failures.push({
        sourceId,
        title: item.vod_name || "未知作品",
        reason: error.message,
      });

      console.log(`  失败：${error.message}`);
    }

    if (i < list.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const outputDir = path.resolve("data");
  await fs.mkdir(outputDir, { recursive: true });

  const outputFile = path.join(
    outputDir,
    "vod-page-1.normalized.json"
  );

  const result = {
    meta: {
      page: PAGE,
      listedCount: list.length,
      successCount: dramas.length,
      failureCount: failures.length,
      episodeCount: dramas.reduce(
        (sum, drama) => sum + drama.episodes.length,
        0
      ),
      testedAt: new Date().toISOString(),
    },
    dramas,
    failures,
  };
  console.log("保存前检查作品名称：", result.dramas[0]?.title);
  console.log("保存前检查地区：", result.dramas[0]?.area);
  console.log("保存前检查第一集：", result.dramas[0]?.episodes[0]?.title);
  await fs.writeFile(
    outputFile,
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log("\n第一页测试完成！");
  console.log("列表作品数：", list.length);
  console.log("详情解析成功：", dramas.length);
  console.log("详情解析失败：", failures.length);
  console.log("分集记录总数：", result.meta.episodeCount);
  console.log("结果文件：", outputFile);
  console.log("本次没有写入数据库。");
}

main().catch((error) => {
  console.error("\n测试失败：", error.message);
  process.exitCode = 1;
});
