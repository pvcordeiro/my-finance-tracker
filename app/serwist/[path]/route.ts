import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      { url: "/", revision },
      { url: "/manage", revision },
      { url: "/details", revision },
      { url: "/user", revision },
      { url: "/login", revision },
      { url: "/~offline", revision },
    ],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
