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
