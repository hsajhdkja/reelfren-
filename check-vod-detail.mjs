
const API_URL = process.env.VOD_API_URL;

if (!API_URL) {
  throw new Error("请先设置 VOD_API_URL 环境变量。");
}

async function main() {
  // 先获取第一页的第一部作品
  const listUrl = new URL(API_URL);
  listUrl.searchParams.set("ac", "list");
  listUrl.searchParams.set("pg", "1");

  const listResponse = await fetch(listUrl);
  const listData = await listResponse.json();

  if (!Array.isArray(listData.list) || !listData.list[0]) {
    throw new Error("列表接口没有返回作品。");
  }

  const item = listData.list[0];
  const id = String(item.vod_id);

  console.log("作品名称：", item.vod_name);
  console.log("作品 ID：", id);

  // 使用该 ID 查询详情
  const detailUrl = new URL(API_URL);
  detailUrl.searchParams.set("ac", "detail");
  detailUrl.searchParams.set("ids", id);

  console.log("\n详情请求地址：", detailUrl.toString());

  const response = await fetch(detailUrl);
  console.log("HTTP 状态码：", response.status);

  const text = await response.text();

  // 不打印可能很长的播放地址，只打印必要的诊断信息
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    console.log("返回内容不是 JSON：", text.slice(0, 500));
    return;
  }

  console.log("接口 code：", data.code);
  console.log("接口 msg：", data.msg);
  console.log("返回 list 数量：", Array.isArray(data.list) ? data.list.length : "没有 list 数组");

  if (Array.isArray(data.list) && data.list[0]) {
    const detail = data.list[0];

    console.log("返回作品名称：", detail.vod_name);
    console.log("返回作品 ID：", detail.vod_id);
    console.log("是否包含 vod_play_url：", Object.hasOwn(detail, "vod_play_url"));
    console.log("播放地址是否非空：", Boolean(detail.vod_play_url));
  } else {
    console.log("返回内容摘要：", JSON.stringify(data).slice(0, 1000));
  }
}

main().catch((error) => {
  console.error("诊断失败：", error.message);
  process.exitCode = 1;
});
