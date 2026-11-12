import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["heic-convert"],
  experimental: {
    serverActions: {
      // Phone photos exceed the 1 MB default and the browser then shows "couldn't load".
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
