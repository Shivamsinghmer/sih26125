import path from "node:path";

import type { NextConfig } from "next";

const repoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  // Workspace packages ship as TypeScript source rather than built output, so
  // Next has to compile them itself.
  transpilePackages: ["@sih26125/chain", "@sih26125/identity"],

  // Emit a self-contained server with only the files actually reached. In a pnpm
  // workspace this is the difference between a container that carries the whole
  // monorepo's node_modules and one that carries what the console uses. Vercel
  // builds its own bundle and ignores this.
  output: "standalone",

  // There is a stray lockfile above this repo; without this Next infers the
  // wrong workspace root and warns on every start.
  outputFileTracingRoot: repoRoot,

  experimental: {
    // Server actions default to a 1MB body. Onboarding accepts a 2MB photo, so
    // anything between the two was refused by the framework before the action
    // ran — the user got a runtime error page instead of the "Photo is too
    // large" sentence written for exactly that case. Raised above the app's own
    // limit so that limit is the one that speaks. See MAX_PHOTO_BYTES.
    serverActions: { bodySizeLimit: "4mb" },
  },

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
