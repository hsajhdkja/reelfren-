import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// PUT /api/admin/episodes/[id] —— 编辑一集(传什么改什么)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const episodeId = Number(id);
  if (!Number.isInteger(episodeId) || episodeId < 1) {
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

  const data: Record<string, unknown> = {};
  if ("number" in body) {
    const number = Number(body.number);
    if (!Number.isInteger(number) || number < 1) {
      return Response.json(
        { error: "INVALID_NUMBER", message: "number 必须是正整数" },
        { status: 400 }
      );
    }
    data.number = number;
  }
  if ("title" in body) data.title = String(body.title).trim();
  if ("videoUrl" in body) data.videoUrl = String(body.videoUrl).trim();

  if (Object.keys(data).length === 0) {
    return Response.json(
      { error: "NOTHING_TO_UPDATE", message: "没有提供任何可更新的字段" },
      { status: 400 }
    );
  }

  const existing = await prisma.episode.findUnique({
    where: { id: episodeId },
  });
  if (!existing) {
    return Response.json(
      { error: "EPISODE_NOT_FOUND", message: "剧集不存在" },
      { status: 404 }
    );
  }

  const episode = await prisma.episode.update({
    where: { id: episodeId },
    data,
  });
  return Response.json(episode);
}

// DELETE /api/admin/episodes/[id] —— 删一集
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const episodeId = Number(id);
  if (!Number.isInteger(episodeId) || episodeId < 1) {
    return Response.json(
      { error: "INVALID_ID", message: "id 必须是正整数" },
      { status: 400 }
    );
  }

  const existing = await prisma.episode.findUnique({
    where: { id: episodeId },
  });
  if (!existing) {
    return Response.json(
      { error: "EPISODE_NOT_FOUND", message: "剧集不存在" },
      { status: 404 }
    );
  }

  await prisma.episode.delete({ where: { id: episodeId } });
  return Response.json({ deleted: true });
}
