import type { NextRequest } from "next/server";
import { dramas, categories } from "@/data/dramas";

// GET /api/dramas?keyword=女王&category=Romance&page=1&pageSize=6
// 短剧列表接口:支持关键词搜索、分类筛选、分页
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // ---- 1. 读取参数 ----
  // searchParams.get() 返回文字或 null,?? 表示"如果是 null 就用默认值"
  const keyword = (searchParams.get("keyword") ?? "").trim();
  const category = searchParams.get("category") ?? "All";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 6);

  // ---- 2. 参数校验:不对就拒绝,并说明哪里不对 ----
  if (!Number.isInteger(page) || page < 1) {
    return Response.json(
      { error: "INVALID_PAGE", message: "page 必须是正整数" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    return Response.json(
      { error: "INVALID_PAGE_SIZE", message: "pageSize 必须是 1~50 的整数" },
      { status: 400 }
    );
  }

  const validCategories = categories.map((item) => item.value); // ["All","Romance",...]
  if (!validCategories.includes(category)) {
    return Response.json(
      { error: "INVALID_CATEGORY", message: `category 只能是：${validCategories.join("、")}` },
      { status: 400 }
    );
  }

  // ---- 3. 过滤:分类 + 关键词(和首页当初的筛选逻辑一样,只是搬到了服务端) ----
  const query = keyword.toLowerCase();
  const filtered = dramas.filter((drama) => {
    const matchCategory = category === "All" || drama.category === category;
    const matchKeyword =
      !query ||
      drama.title.toLowerCase().includes(query) ||
      drama.description.toLowerCase().includes(query);
    return matchCategory && matchKeyword;
  });

  // ---- 4. 分页:切出当前页那一小片 ----
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  // ---- 5. 返回 ----
  return Response.json({ total, page, pageSize, totalPages, items });
}
