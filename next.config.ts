import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "pg", "pg-boss", "pg-native"],
  experimental: {
    optimizePackageImports: [
      "@base-ui/react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 25,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@prisma/client$": path.join(
          process.cwd(),
          "node_modules/@prisma/client/index-browser.js",
        ),
      };
    }
    return config;
  },
};

export default nextConfig;
