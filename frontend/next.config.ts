import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        externalDir: true,
        extensionAlias: {
            ".js": [".ts", ".tsx", ".js"],
            ".mjs": [".mts", ".mjs"],
            ".cjs": [".cts", ".cjs"],
        },
    },
    allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
};

export default nextConfig;
