import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 安全响应头:每个响应都带上,浏览器据此启用防护
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // 禁止被嵌入 iframe(防点击劫持)
          { key: "X-Content-Type-Options", value: "nosniff" }, // 禁止浏览器猜文件类型
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // 跳出去时不泄露完整网址
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // 禁用不需要的设备权限
          },
        ],
      },
    ];
  },
};

export default nextConfig;
