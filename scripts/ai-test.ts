// 阶段 7 第 1 课:AI 通路冒烟测试(对话 + 向量各打一发)
// 运行:npx tsx scripts/ai-test.ts
import "dotenv/config";

const BASE = process.env.LLM_BASE_URL!;
const KEY = process.env.LLM_API_KEY!;

async function main() {
  if (!BASE || !KEY) {
    console.error("请先在 .env 里配置 LLM_BASE_URL 和 LLM_API_KEY");
    process.exit(1);
  }

  // ---- 1. 对话测试:让 AI 自我介绍 ----
  console.log("正在测试对话接口…");
  const chatRes = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`, // Bearer + 密钥 = "我是有账号的人"
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [
        {
          role: "system",
          content: "你是 ReelFren 短剧网站的推荐助手,回答必须简短。",
        },
        { role: "user", content: "用一句话介绍你自己" },
      ],
    }),
  });
  if (!chatRes.ok) {
    console.error("对话接口失败:", chatRes.status, await chatRes.text());
    process.exit(1);
  }
  const chatData = await chatRes.json();
  console.log("✅ AI 回复:", chatData.choices[0].message.content);

  // ---- 2. 向量测试:把一句话变成语义坐标 ----
  console.log("正在测试向量接口…");
  const embRes = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL,
      input: "女主角复仇逆袭的短剧",
    }),
  });
  if (!embRes.ok) {
    console.error("向量接口失败:", embRes.status, await embRes.text());
    process.exit(1);
  }
  const embData = await embRes.json();
  const vector: number[] = embData.data[0].embedding;
  console.log(`✅ 向量维度: ${vector.length}(bge-m3 应为 1024)`);
  console.log("前 5 个数字:", vector.slice(0, 5).map((n) => n.toFixed(4)));
}

main();
