import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // monorepo root — ชี้ไปที่ kaizen/ root เพื่อ silence multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname, "../../"),

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
    ],
  },

  serverExternalPackages: ["sharp", "ioredis"],
};

export default nextConfig;
