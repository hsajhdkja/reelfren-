// LangChain 版 AI 管线:模型 + 嵌入用框架标准件;
// 检索用自研余弦(数据量小;LangChain v1 已移除内置内存向量库,详见阶段 10 第 3 课笔记)
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { prisma } from "./prisma";

// ---- 标准件 1:Embeddings(文字 → 向量) ----
export const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  apiKey: process.env.LLM_API_KEY,
  configuration: { baseURL: process.env.LLM_BASE_URL },
});

// ---- 标准件 2:Model(对话模型) ----
export function getModel() {
  return new ChatOpenAI({
    model: process.env.LLM_MODEL,
    apiKey: process.env.LLM_API_KEY,
    configuration: { baseURL: process.env.LLM_BASE_URL },
    temperature: 0.7,
  });
}

// ---- 检索:问题向量化 + 与全部上架剧比对 + 返回前 3 ----
export async function searchRelevant(query: string) {
  const vector = await embeddings.embedQuery(query);

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

  const scored = rows
    .map(({ embedding, ...drama }) => {
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
    })
    .sort((x, y) => y.similarity - x.similarity);

  return scored.slice(0, 3).filter((d) => d.similarity > 0.3);
}
