import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST /api/auth/register —— 注册接口
// 请求体(JSON):{ "email": "a@b.com", "password": "至少8位" }
export async function POST(request: Request) {
  // ---- 1. 读请求体 ----
    // 限流:同一 IP 每分钟最多注册 5 次
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    return Response.json(
      { error: "TOO_MANY_REQUESTS", message: "操作太频繁，请一分钟后再试" },
      { status: 429 }
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_JSON", message: "请求体必须是合法 JSON" },
      { status: 400 }
    );
  }

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };

  // ---- 2. 参数校验:邮箱格式、密码长度 ----
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "INVALID_EMAIL", message: "邮箱格式不正确" },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return Response.json(
      { error: "INVALID_PASSWORD", message: "密码必须是 8~72 位" },
      { status: 400 }
    );
  }

  // ---- 3. 统一格式后查重 ----
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return Response.json(
      { error: "EMAIL_TAKEN", message: "该邮箱已被注册" },
      { status: 409 }
    );
  }

  // ---- 4. 把密码变成指纹,连同邮箱存库 ----
  const passwordHash = await bcrypt.hash(password, 10); // 10 = 哈希强度
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash },
  });

  // ---- 5. 返回:只给 id 和 email,绝不把指纹发出去 ----
  return Response.json({ id: user.id, email: user.email }, { status: 201 });
}
