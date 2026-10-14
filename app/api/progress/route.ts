import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/progress —— 保存进度,请求体 { "episodeId": 5, "positionSec": 123.4 }
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    episodeId?: unknown;
    positionSec?: unknown;
  } | null;
  const episodeId = Number(body?.episodeId);
  const positionSec = Number(body?.positionSec);

  if (!Number.isInteger(episodeId) || episodeId < 1) {
    return Response.json(
      { error: "INVALID_EPISODE_ID", message: "episodeId 必须是正整数" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(positionSec) || positionSec < 0) {
    return Response.json(
      { error: "INVALID_POSITION", message: "positionSec 必须是不小于 0 的数字" },
      { status: 400 }
    );
  }

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
  });
  if (!episode) {
    return Response.json(
      { error: "EPISODE_NOT_FOUND", message: "剧集不存在" },
      { status: 404 }
    );
  }

  // upsert:看过就覆盖,没看过就新建(一人一集一条记录)
  await prisma.watchProgress.upsert({
    where: { userId_episodeId: { userId: user.id, episodeId } },
    update: { positionSec },
    create: { userId: user.id, episodeId, positionSec },
  });

  return Response.json({ saved: true, positionSec });
}

// GET /api/progress?episodeId=5 —— 读某集的进度(没看过返回 0)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const episodeId = Number(
    new URL(request.url).searchParams.get("episodeId")
  );
  if (!Number.isInteger(episodeId) || episodeId < 1) {
    return Response.json(
      { error: "INVALID_EPISODE_ID", message: "episodeId 必须是正整数" },
      { status: 400 }
    );
  }

  const progress = await prisma.watchProgress.findUnique({
    where: { userId_episodeId: { userId: user.id, episodeId } },
  });

  return Response.json({ positionSec: progress?.positionSec ?? 0 });
}
