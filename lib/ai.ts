// AI 调用公共库:向量 + 对话(全站共用)
import "dotenv/config";

const BASE = process.env.LLM_BASE_URL!;
const KEY = process.env.LLM_API_KEY!;

// 一段文字 → 语义向量
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL,
      input: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`向量接口失败 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}

// 一组对话 → AI 的回答文字
export async function chat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages,
    }),
  });
  if (!res.ok) {
    throw new Error(`对话接口失败 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}
// 流式对话:AI 每吐一段文字,onDelta 就被调用一次;函数最终返回完整文字
export async function chatStream(
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages,
      stream: true, // 关键:开启流式
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`对话接口失败 ${res.status}: ${await res.text()}`);
  }

  // 逐块读取并解析 SSE:"data: {...}" 每行是一个增量片段
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // 最后一行可能不完整,留给下一块拼

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue; // 智谱/OpenAI 的结束标记
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // 忽略无法解析的行(如注释行)
      }
    }
  }
  return full;
}
// ---- Agent 支持:带工具调用的对话(阶段 10 第 2 课) ----

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema 格式的参数说明书
  };
};

// 单轮对话(非流式):支持传工具说明书;返回模型的完整回复消息
// (回复里可能是纯文字,也可能是一张"调用工具的工单")
export async function chatOnce(
  messages: ChatMessage[],
  tools?: ToolDefinition[]
): Promise<ChatMessage> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages,
      ...(tools && tools.length > 0 ? { tools } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`对话接口失败 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices[0].message as ChatMessage;
}
