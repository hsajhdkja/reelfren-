import { prisma } from "@/lib/prisma";
import { chatOnce, embed, type ChatMessage, type ToolDefinition } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";

// ---- 工具实现:语义搜索短剧(复用第 1 课的向量检索) ----
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
      embedding: true,
    },
  });

  const scored = rows.map(({ embedding, ...drama }) => {
    const a = vector;
    const b = JSON.parse(embedding!) as number[];
    let dot = 0;
    let lenA = 0;
    let lenB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      lenA += a[i] * a[i];
      lenB += b[i] * b[i];
    }
    return {
      ...drama,
      similarity: dot / (Math.sqrt(lenA) * Math.sqrt(lenB) || 1),
    };
  });

  scored.sort((x, y) => y.similarity - x.similarity);

  // 给模型看的"工具返回值":紧凑的纯文字,省 token
  return scored
    .slice(0, 3)
    .map(
      (d) =>
        `《${d.title}》(${d.category}，评分${d.rating}）：${d.description}`
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

// GET /api/assistant —— 读取我的最近对话历史(进页面时渲染用)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const rows = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 50, // 最多取最近 50 条
  });

  const items = rows.map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
    tools: row.tools ? (JSON.parse(row.tools) as string[]) : undefined,
  }));

  return Response.json({ items });
}

// POST /api/assistant —— 发消息:历史由服务端从数据库读取(持久化记忆!)
// 请求体:{ "content": "用户的新消息" }
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "请先登录" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    content?: unknown;
  } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 500) {
    return Response.json(
      { error: "INVALID_CONTENT", message: "消息必须是 1~500 字" },
      { status: 400 }
    );
  }

  // ---- 关键升级:从数据库读最近 10 条历史作为上下文(服务端记忆!) ----
  const historyRows = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const history: ChatMessage[] = historyRows
    .reverse()
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是 ReelFren 短剧平台的 AI 推荐助手。回答简短友好;当用户想找剧或提到想看的内容时,先调用 search_dramas 工具查询真实剧目,基于查询结果回答,绝不编造站内不存在的剧。",
    },
    ...history,
    { role: "user", content },
  ];

  const toolsUsed: string[] = [];
  let assistantContent = "";

  // ---- Agent 循环(最多 3 轮工具调用) ----
  for (let round = 0; round < 3; round++) {
    const assistantMessage = await chatOnce(messages, TOOLS);
    messages.push(assistantMessage);

    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      assistantContent = assistantMessage.content ?? "";
      break;
    }

    for (const call of assistantMessage.tool_calls) {
      if (call.function.name === "search_dramas") {
        toolsUsed.push("search_dramas");
        let args: { query?: string } = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        const result = await searchDramas(String(args.query ?? ""));
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result || "没有找到匹配的短剧",
        });
      } else {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: "未知工具",
        });
      }
    }
  }

  if (!assistantContent) {
    // 3 轮循环耗尽:不带工具强制让它总结
    const finalMessage = await chatOnce(messages);
    assistantContent = finalMessage.content ?? "";
  }

  // ---- 双双入库:会话记忆持久化 ----
  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: "user", content },
      { userId: user.id, role: "assistant", content: assistantContent },
    ],
  });

  return Response.json({ reply: assistantContent, toolsUsed });
}
