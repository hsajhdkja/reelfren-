import { clearSessionCookie } from "@/lib/auth";

// POST /api/auth/logout —— 退出:作废通行证
export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
