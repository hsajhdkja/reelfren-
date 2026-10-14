import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { categories } from "@/data/dramas"; // 分类仍是配置数据,暂留在这

// GET /api/dramas?keyword=xxx&category=Romance&page=1&pageSize=6
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // ---- 1. 读取参数(和上一版完全一样) ----
  const keyword = (searchParams.get("keyword") ?? "").trim();
  const category = searchParams.get("category") ?? "All";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 6);

  // ---- 2. 参数校验(和上一版完全一样) ----
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
  const validCategories = categories.map((item) => item.value);
  if (!validCategories.includes(category)) {
    return Response.json(
      { error: "INVALID_CATEGORY", message: `category 只能是：${validCategories.join("、")}` },
      { status: 400 }
    );
  }

  // ---- 3. 组装查询条件(翻译官的活:条件对象 → SQL 的 WHERE) ----
  const where = {
    published: true, // 游客只见上架的(管理员走别的接口)
    ...(category === "All" ? {} : { category }),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {}),
  };

  // ---- 4. 查库:一条数总数,一条取当前页 ----
  const total = await prisma.drama.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = await prisma.drama.findMany({
    where,
    orderBy: { id: "asc" },
    skip: (page - 1) * pageSize, // 跳过前几条 = 分页公式
    take: pageSize,              // 取多少条
    include: { _count: { select: { episodes: true } } }, // 顺带统计每部剧有几集
  });

  // ---- 5. 整形成前端认识的形状(JSON 结构和上一版一致) ----
  const items = rows.map(({ _count, ...drama }) => ({
    ...drama,
    episodes: _count.episodes, // 总集数:从数据库统计得出,不再手动维护
    episodeList: [],           // 列表页不需要明细,给空数组保持结构
  }));

  return Response.json({ total, page, pageSize, totalPages, items });
}
