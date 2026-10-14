import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/favorites —— 我收藏的剧(需要登录)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const rows = await prisma.favorite.findMany({
    where: { userId: user.id }, // 只看自己的!
    orderBy: { createdAt: "desc" }, // 最近收藏的排前面
    include: { drama: true }, // 连剧的信息一起取
  });

  const items = rows.map((row) => row.drama);
  return Response.json({ total: items.length, items });
}

// POST /api/favorites —— 收藏一部剧,请求体 { "dramaId": 2 }
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    dramaId?: unknown;
  } | null;
  const dramaId = Number(body?.dramaId);
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    return Response.json(
      { error: "INVALID_DRAMA_ID", message: "dramaId 必须是正整数" },
      { status: 400 }
    );
  }

  const drama = await prisma.drama.findUnique({ where: { id: dramaId } });
  if (!drama) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  // upsert:已收藏就原地不动,没收藏就新建(幂等,重复点不报错)
  await prisma.favorite.upsert({
    where: { userId_dramaId: { userId: user.id, dramaId } },
    update: {},
    create: { userId: user.id, dramaId },
  });

  return Response.json({ favorited: true }, { status: 201 });
}

// DELETE /api/favorites —— 取消收藏,请求体 { "dramaId": 2 }
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    dramaId?: unknown;
  } | null;
  const dramaId = Number(body?.dramaId);
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    return Response.json(
      { error: "INVALID_DRAMA_ID", message: "dramaId 必须是正整数" },
      { status: 400 }
    );
  }

  // deleteMany:没收藏过也安静返回成功(取消收藏本来就不用报错)
  await prisma.favorite.deleteMany({
    where: { userId: user.id, dramaId },
  });

  return Response.json({ favorited: false });
}
