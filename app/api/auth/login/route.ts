import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

// POST /api/auth/login —— 登录:验证密码,发通行证
export async function POST(request: Request) {
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
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return Response.json(
      { error: "MISSING_FIELDS", message: "邮箱和密码都必须填写" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // 安全细节:用户不存在 和 密码错误,返回同一个错误(防撞库探测)
  if (!user) {
    return Response.json(
      { error: "WRONG_CREDENTIALS", message: "邮箱或密码不正确" },
      { status: 401 }
    );
  }

  // bcrypt.compare:把你输入的密码再算一次指纹,和库里比对
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return Response.json(
      { error: "WRONG_CREDENTIALS", message: "邮箱或密码不正确" },
      { status: 401 }
    );
  }

  // 验证通过:发通行证(写进 httpOnly Cookie)
  await setSessionCookie(user.id);
  return Response.json({ id: user.id, email: user.email });
}
