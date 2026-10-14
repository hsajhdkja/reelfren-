import { prisma } from "@/lib/prisma";
import { embed, chat } from "@/lib/ai";

// 余弦相似度:两个向量越"同方向",值越接近 1
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let lenA = 0;
  let lenB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    lenA += a[i] * a[i];
    lenB += b[i] * b[i];
  }
  return dot / (Math.sqrt(lenA) * Math.sqrt(lenB) || 1);
}

// GET /api/search/ai?q=想看女主复仇逆袭的剧
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json(
      { error: "MISSING_QUERY", message: "告诉我你想看什么呀(q 不能为空)" },
      { status: 400 }
    );
  }

  // ---- R 第 1 步:用户的话 → 向量 ----
  const queryVector = await embed(q);

  // ---- R 第 2 步:和所有上架的剧比相似度 ----
  const rows = await prisma.drama.findMany({
    where: { published: true, NOT: [{ embedding: null }] },
    select: {
      id: true,
      title: true,
      category: true,
      rating: true,
      description: true,
      image: true,
      tag: true,
      embedding: true,
    },
  });

  const scored = rows.map(({ embedding, ...drama }) => ({
    ...drama,
    similarity: cosine(queryVector, JSON.parse(embedding!)),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);

  // 取前 3;相似度太低的(比如用户问了个毫不相干的东西)不要
  const top = scored.slice(0, 3).filter((d) => d.similarity > 0.3);

  // ---- G 第 3 步:把候选塞给 AI,生成推荐理由(RAG 的 G) ----
  let reasons: Record<number, string> = {};
  if (top.length > 0) {
    try {
      const listText = top
        .map(
          (d) =>
            `${d.id}.《${d.title}》(${d.category},评分${d.rating})：${d.description}`
        )
        .join("\n");
      const answer = await chat([
        {
          role: "system",
          content:
            "你是短剧推荐助手。根据用户的喜好描述,为每一部候选短剧各写一句不超过40字的推荐理由,说明它为什么符合用户想看的。候选有几部就写几条,每条的 id 必须原样使用候选给出的 id。只输出 JSON 数组,格式:[{\"id\":1,\"reason\":\"...\"}],不要输出任何其他内容。",
        },
        { role: "user", content: `用户想看：${q}\n\n候选短剧：\n${listText}` },
      ]);
      // AI 有时会用 markdown 代码块包裹,剥掉再解析
      const jsonText = answer.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonText) as { id: number; reason: string }[];
      reasons = Object.fromEntries(parsed.map((p) => [p.id, p.reason]));
    } catch {
      // AI 罢工也不影响搜索结果,只是暂时没推荐理由
    }
  }

  return Response.json({
    q,
    items: top.map((d) => ({
      ...d,
      similarity: Number(d.similarity.toFixed(4)),
      reason: reasons[d.id] ?? `贴合“${q}”的观看偏好`, // AI 偶尔漏写,代码兜底
    })),
  });
}
