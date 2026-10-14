import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET —— 该剧的全部集(按集数排序),仅管理员
export async function GET(
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

  const drama = await prisma.drama.findUnique({ where: { id: dramaId } });
  if (!drama) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  const episodes = await prisma.episode.findMany({
    where: { dramaId },
    orderBy: { number: "asc" },
  });
  return Response.json({ total: episodes.length, items: episodes });
}

// POST —— 新增一集 { "number?": 3, "title": "重逢", "videoUrl": "https://..." }
// number 省略时自动排到当前最大集数 + 1
export async function POST(
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
  const title = String(body?.title ?? "").trim();
  const videoUrl = String(body?.videoUrl ?? "").trim();
  if (!title || !videoUrl) {
    return Response.json(
      { error: "MISSING_FIELDS", message: "标题和视频地址不能为空" },
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

  // 集数:没传就自动接在最后
  let number = Number(body?.number);
  if (!Number.isInteger(number) || number < 1) {
    const last = await prisma.episode.findFirst({
      where: { dramaId },
      orderBy: { number: "desc" },
    });
    number = last ? last.number + 1 : 1;
  }

  // 提前查重,给出友好错误(否则会撞联合唯一约束报 500)
  const dup = await prisma.episode.findUnique({
    where: { dramaId_number: { dramaId, number } },
  });
  if (dup) {
    return Response.json(
      { error: "EPISODE_NUMBER_TAKEN", message: `第 ${number} 集已存在` },
      { status: 409 }
    );
  }

  const episode = await prisma.episode.create({
    data: { dramaId, number, title, videoUrl },
  });
  return Response.json(episode, { status: 201 });
}
