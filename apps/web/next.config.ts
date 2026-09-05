import path from "node:path";

import type { NextConfig } from "next";

const repoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  // Workspace packages ship as TypeScript source rather than built output, so
  // Next has to compile them itself.
  transpilePackages: ["@sih26125/chain", "@sih26125/identity"],

  // There is a stray lockfile above this repo; without this Next infers the
  // wrong workspace root and warns on every start.
  outputFileTracingRoot: repoRoot,

  webpack: (config) => {
    // Our packages use Node's ESM convention of importing "./x.js" from "./x.ts".
    // Node and Bun resolve that; webpack needs to be told.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
