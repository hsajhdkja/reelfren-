import { getCurrentUser } from "@/lib/auth";

// GET /api/auth/me —— "我是谁":未登录返回 401
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "NOT_LOGGED_IN", message: "未登录" },
      { status: 401 }
    );
  }
  return Response.json(user);
}
