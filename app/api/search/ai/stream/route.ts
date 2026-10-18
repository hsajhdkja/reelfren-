import { prisma } from "@/lib/prisma";
import { embed, chatStream } from "@/lib/ai";

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

// GET /api/search/ai/stream?q=想看女主复仇的剧
// SSE 流式版:先推剧目,再逐部流式生成推荐理由
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json(
      { error: "MISSING_QUERY", message: "q 不能为空" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 小工具:按 SSE 格式推一条事件给前端
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // ---- R:向量检索(与旧接口一致) ----
        const queryVector = await embed(q);
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
        const top = scored.slice(0, 3).filter((d) => d.similarity > 0.3);

        // ---- 剧目先推给前端:卡片立刻出现(理由还没生成) ----
        send(
          "items",
          {
            items: top.map(({ similarity, ...d }) => ({
              ...d,
              similarity: Number(similarity.toFixed(4)),
            })),
          }
        );

        // ---- G:逐部流式生成推荐理由(每部独立,不会漏) ----
        for (const d of top) {
          send("reason-start", { id: d.id });
          await chatStream(
            [
              {
                role: "system",
                content:
                  "你是短剧推荐助手。只输出一句不超过40字的推荐理由,说明这部剧为什么符合用户的喜好。不要输出任何其他内容。",
              },
              {
                role: "user",
                content: `用户想看：${q}\n这部剧：《${d.title}》(${d.category}，评分${d.rating}）：${d.description}`,
              },
            ],
            (delta) => send("reason-delta", { id: d.id, text: delta })
          );
          send("reason-done", { id: d.id });
        }

        send("done", {});
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "服务器错误",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream", // SSE 的身份标识
      "Cache-Control": "no-cache, no-transform", // 禁止缓存和改写
      Connection: "keep-alive",
    },
  });
}
