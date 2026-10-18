import { prisma } from "@/lib/prisma";
import { chatOnce, embed, type ChatMessage, type ToolDefinition } from "@/lib/ai";

// ---- 工具的实现:语义搜索短剧(复用第 1 课的向量检索) ----
async function searchDramas(query: string) {
  const vector = await embed(query);
  const rows = await prisma.drama.findMany({
    where: { published: true, NOT: [{ embedding: null }] },
    select: {
      id: true,
      title: true,
      category: true,
      rating: true,
      description: true,
      embedding: true, // 语义向量:搜索就靠它
    },
  });

  const scored = rows.map(({ embedding, ...drama }) => {
    let dot = 0;
    let lenA = 0;
    let lenB = 0;
    const a = vector;
    const b = JSON.parse(embedding!) as number[];
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      lenA += a[i] * a[i];
      lenB += b[i] * b[i];
    }
    return { ...drama, similarity: dot / (Math.sqrt(lenA) * Math.sqrt(lenB) || 1) };
  });

  scored.sort((x, y) => y.similarity - x.similarity);

  // 给模型看的"工具返回值":紧凑的纯文字,省 token
  return scored
    .slice(0, 3)
    .map(
      (d) =>
        `《${d.title}》(${d.category},评分${d.rating}):${d.description}`
    )
    .join("\n");
}

// ---- 工具说明书:告诉模型有哪些工具、何时用 ----
const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_dramas",
      description:
        "语义搜索站内短剧,返回最匹配的剧目列表。当用户想找剧、问有什么剧、或描述了想看的内容时,必须先调用这个工具。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "用户想看的内容描述,例如:女主复仇逆袭",
          },
        },
        required: ["query"],
      },
    },
  },
];

// POST /api/assistant —— AI 推荐助手
// 请求体:{ "messages": [{ "role": "user", "content": "..." }, ...] }
// 响应体:{ "reply": "助手的回答", "toolsUsed": ["search_dramas"] }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
  } | null;

  // ---- 校验前端传来的会话历史 ----
  const history = Array.isArray(body?.messages) ? body!.messages : null;
  if (
    !history ||
    history.length === 0 ||
    history.length > 20 || // 防止会话无限膨胀
    history.some(
      (m) =>
        typeof m !== "object" ||
        m === null ||
        !["user", "assistant"].includes((m as ChatMessage).role ?? "") ||
        typeof (m as ChatMessage).content !== "string"
    )
  ) {
    return Response.json(
      { error: "INVALID_MESSAGES", message: "messages 格式不正确" },
      { status: 400 }
    );
  }

  // 只保留最近 10 条,拼上系统提示词
  const recent = history.slice(-10) as ChatMessage[];
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是 ReelFren 短剧平台的 AI 推荐助手。回答简短友好;当用户想找剧或提到想看的内容时,先调用 search_dramas 工具查询真实剧目,基于查询结果回答,绝不编造站内不存在的剧。",
    },
    ...recent,
  ];

  const toolsUsed: string[] = [];

  // ---- Agent 循环:最多 3 轮工具调用 ----
  for (let round = 0; round < 3; round++) {
    const assistantMessage = await chatOnce(messages, TOOLS);
    messages.push(assistantMessage);

    // 没有工具调用 → 这就是最终回答,收工
    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      return Response.json({
        reply: assistantMessage.content ?? "",
        toolsUsed,
      });
    }

    // 有工单 → 逐个执行,把结果回传给模型
    for (const call of assistantMessage.tool_calls) {
      if (call.function.name === "search_dramas") {
        toolsUsed.push("search_dramas");
        let args: { query?: string } = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // 参数解析失败就给空值,让工具返回兜底结果
        }
        const result = await searchDramas(String(args.query ?? ""));
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result || "没有找到匹配的短剧",
        });
      } else {
        // 未知工具:如实告诉模型"这工具不存在"
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: "未知工具",
        });
      }
    }
  }

  // 3 轮后还没收敛:不带工具强制让它总结
  const finalMessage = await chatOnce(messages);
  return Response.json({
    reply: finalMessage.content ?? "",
    toolsUsed,
  });
}
