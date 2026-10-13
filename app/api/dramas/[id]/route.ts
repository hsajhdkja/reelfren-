import { getDramaById } from "@/data/dramas";

// GET /api/dramas/[id] —— 短剧详情接口
// 访问 /api/dramas/2 返回 2 号剧;不存在返回 404 + 错误说明
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const drama = getDramaById(Number(id));

  if (!drama) {
    return Response.json(
      { error: "DRAMA_NOT_FOUND", message: "短剧不存在" },
      { status: 404 }
    );
  }

  return Response.json(drama);
}
