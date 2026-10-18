import { getModel, searchRelevant } from "@/lib/rag";

// GET /api/search/ai?q=... —— 语义搜索(LangChain 模型/嵌入标准件 + 自研检索)
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json(
      { error: "MISSING_QUERY", message: "q 不能为空" },
      { status: 400 }
    );
  }

  // ---- R:检索(问题向量化 + 余弦排序 + 取前3) ----
  const top = await searchRelevant(q);

  // ---- G:对话模型逐部生成推荐理由(带兜底) ----
  const model = getModel();
  const items = [];
  for (const drama of top) {
    let reason: string | null = null;
    try {
      const answer = await model.invoke(
        `用户想看：${q}\n这部剧：《${drama.title}》(${drama.category}，评分${drama.rating})：${drama.description}\n只输出一句不超过40字的推荐理由。`
      );
      reason = typeof answer.content === "string" ? answer.content : null;
    } catch {
      reason = null; // AI 罢工不影响搜索结果
    }
    items.push({ ...drama, reason });
  }

  return Response.json({ q, items });
}
