import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// 允许管理员改的字段白名单:不在名单里的字段一律忽略
const EDITABLE_FIELDS = [
  "title",
  "category",
  "rating",
  "description",
  "image",
  "tag",
  "published",
] as const;

// PUT /api/admin/dramas/[id] —— 编辑(传什么改什么;传 published 就是上下架)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const dramaId = Number(id);
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    return Response.json(
      { error: "INVALID_ID", message: "id 必须是正整数" },
      { status: 400 }
    );
  }

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

  // 白名单过滤 + 按类型整理
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      data[field] =
        field === "published" ? body.published === true : String(body[field]).trim();
    }
  }
  if (Object.keys(data).length === 0) {
    return Response.json(
      { error: "NOTHING_TO_UPDATE", message: "没有提供任何可更新的字段" },
      { status: 400 }
    );
  }

  const existing = await prisma.drama.findUnique({ where: { id: dramaId } });
  if (!existing) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  const drama = await prisma.drama.update({
    where: { id: dramaId },
    data,
  });
  return Response.json(drama);
}

// DELETE /api/admin/dramas/[id] —— 删除(级联清掉它的剧集/收藏/进度)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const dramaId = Number(id);
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    return Response.json(
      { error: "INVALID_ID", message: "id 必须是正整数" },
      { status: 400 }
    );
  }

  const existing = await prisma.drama.findUnique({ where: { id: dramaId } });
  if (!existing) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  await prisma.drama.delete({ where: { id: dramaId } });
  return Response.json({ deleted: true });
}
