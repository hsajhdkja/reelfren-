
const API_URL = process.env.VOD_API_URL;

if (!API_URL) {
  console.error("请先设置 VOD_API_URL 环境变量。");
  process.exit(1);
}

async function main() {
  const url = new URL(API_URL);
  url.searchParams.set(
    process.env.VOD_PAGE_PARAM || "pg",
    "1"
  );

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`接口请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.list)) {
    throw new Error("接口返回中没有有效的 list 数组。");
  }

  console.log(`第一页共 ${data.list.length} 部作品\n`);

  for (const [index, item] of data.list.entries()) {
    const playFrom = item.vod_play_from;
    const playUrl = item.vod_play_url;

    console.log(`第 ${index + 1} 部：${item.vod_name}`);
    console.log("  ID：", item.vod_id);
    console.log("  播放源：", playFrom ?? "无");
    console.log(
      "  播放地址字段：",
      playUrl === undefined
        ? "不存在"
        : playUrl === null
          ? "null"
          : typeof playUrl
    );
    console.log(
      "  播放地址长度：",
      typeof playUrl === "string" ? playUrl.length : 0
    );
    console.log(
      "  是否有分集地址：",
      typeof playUrl === "string" && playUrl.trim().length > 0
        ? "有"
        : "没有"
    );
    console.log("");
  }
}

main().catch((error) => {
  console.error("检查失败：", error.message);
  process.exitCode = 1;
});
