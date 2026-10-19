
import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error(
      "缺少 DATABASE_URL 环境变量，请检查项目根目录的 .env 文件。",
    );
  }

  const url = new URL(raw);
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1";

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    connectionLimit: 5,
    ssl: isLocal
      ? undefined
      : {
          ca: fs.readFileSync("tidb-ca.pem"),
          rejectUnauthorized: true,
        },
  });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ??= createClient())
  : (null as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
