import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  serverExternalPackages: ["exceljs", "pg", "pg-boss", "pg-native"],
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 25,
  },
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.BannerPlugin({
          raw: true,
          banner:
            'var global = typeof globalThis !== "undefined" ? globalThis : self;',
        }),
      );
      return config;
    }
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
