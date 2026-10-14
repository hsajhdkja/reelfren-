// 登录会话工具:签发、验证、读写 Cookie、"我是谁"
import "dotenv/config";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "session";
const SESSION_DAYS = 7; // 通行证有效期 7 天

// 密钥:jose 需要"二进制"形式,把 .env 里的文字变换过去
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

// 签发通行证:内容是 userId,7 天后过期
export async function signSession(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

// 验通行证:真 → 返回 userId;假/过期/被改 → null(try/catch 兜底)
export async function verifySession(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

// 登录成功后调用:把通行证放进 httpOnly Cookie
export async function setSessionCookie(userId: number) {
  const token = await signSession(userId);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, // JS 读不到,防 XSS 偷号
    sameSite: "lax", // 防 CSRF 的基础挡板
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production", // 上线后强制 HTTPS 传输
  });
}

// 退出:把通行证作废(删 Cookie)
export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}

// "我是谁":Cookie 里有有效通行证 → 返回用户;否则 null
export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = await verifySession(token);
  if (userId === null) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true }, // 密码指纹绝不外带
  });
}
