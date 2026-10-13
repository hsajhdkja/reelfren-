// 全站共享的数据库连接(单例:有就复用,没有才新建)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

// 挂在全局上的"连接仓库"(开发热重载时防止重复建连接)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // 和 seed.ts 一样:从 .env 的连接串里拆出各要素
  const url = new URL(process.env.DATABASE_URL!);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
