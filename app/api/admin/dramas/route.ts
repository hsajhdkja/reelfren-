import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/admin/dramas —— 全部短剧(含下架的),仅管理员
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const rows = await prisma.drama.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { episodes: true } } },
  });
  const items = rows.map(({ _count, ...drama }) => ({
    ...drama,
    episodes: _count.episodes,
  }));
  return Response.json({ total: items.length, items });
}

// POST /api/admin/dramas —— 新增短剧
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return Response.json(
      { error: "INVALID_JSON", message: "请求体必须是合法 JSON" },
      { status: 400 }
    );
  }

  // 只收字符串、只留该留的字段(多发的字段直接丢掉——防"字段注入")
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const rating = String(body.rating ?? "").trim();
  const description = String(body.description ?? "").trim();
  const image = String(body.image ?? "").trim();
  const tag = String(body.tag ?? "").trim();

  if (!title || !category || !description || !image) {
    return Response.json(
      { error: "MISSING_FIELDS", message: "标题/分类/简介/图片地址不能为空" },
      { status: 400 }
    );
  }

  const drama = await prisma.drama.create({
    data: {
      title,
      category,
      rating: rating || "0.0",
      description,
      image,
      tag: tag || "NEW",
      published: body.published !== false,
    },
  });

  return Response.json(drama, { status: 201 });
}
