import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core ships native/optional deps that must not be bundled.
  serverExternalPackages: ["puppeteer-core"],
};

export default nextConfig;
