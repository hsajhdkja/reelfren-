// 简易内存限流:同一身份在时间窗内最多 limit 次,超了返回 false
// ⚠️ 内存版重启就清零、多台服务器不共享——学习项目够用,
//    真上生产应换 Redis 等集中存储(阶段 8 第 4 课的可选优化)
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    // 窗口外/首次:重新计数
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  return entry.count <= limit; // 超过限额 → false
}
