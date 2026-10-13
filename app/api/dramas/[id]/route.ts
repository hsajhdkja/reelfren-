import { prisma } from "@/lib/prisma";

// GET /api/dramas/[id] —— 短剧详情接口(查库版)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dramaId = Number(id);

  // 参数校验:id 必须是正整数
  if (!Number.isInteger(dramaId) || dramaId < 1) {
    return Response.json(
      { error: "INVALID_ID", message: "id 必须是正整数" },
      { status: 400 }
    );
  }

  const drama = await prisma.drama.findUnique({
    where: { id: dramaId },
    include: { episodes: { orderBy: { number: "asc" } } }, // 连它的所有集一起取,按集数排序
  });

  if (!drama) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  // 整形成前端熟悉的形状:episodes=总数,episodeList=明细
  const { episodes, ...dramaData } = drama;
  return Response.json({
    ...dramaData,
    episodes: episodes.length,
    episodeList: episodes,
  });
}
