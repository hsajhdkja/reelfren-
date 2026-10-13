import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts", // 新增:播种命令就是跑这个脚本
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
