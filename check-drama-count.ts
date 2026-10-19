
import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./app/generated/prisma/client";

async function main() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("未读取到 DATABASE_URL");
  }

  const url = new URL(raw);
  const isLocal = url.hostname === "localhost";

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 5,
    connectTimeout: 15_000,
    ssl: isLocal
      ? undefined
      : {
          ca: fs.readFileSync("tidb-ca.pem"),
          rejectUnauthorized: true,
        },
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const dramas = await prisma.drama.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        category: true,
        published: true,
        _count: { select: { episodes: true } },
      },
    });

    console.log("数据库现有作品：");
    console.table(
      dramas.map((drama) => ({
        id: drama.id,
        title: drama.title,
        category: drama.category,
        published: drama.published,
        episodes: drama._count.episodes,
      })),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("查询失败：");
  console.dir(error, { depth: null });
  process.exitCode = 1;
});
