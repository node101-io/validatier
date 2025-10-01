import path from "path";

const nextConfig = {
    experimental: {
        externalDir: true,
        extensionAlias: {
            ".js": [".ts", ".tsx", ".js"],
            ".mjs": [".mts", ".mjs"],
            ".cjs": [".cts", ".cjs"],
        },
    },
    allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    // Do not fail builds on lint issues (we can address separately)
    eslint: { ignoreDuringBuilds: true },
    // Avoid bundling optional MongoDB deps that are not used
    webpack: (config: any, ctx: { isServer: boolean }) => {
        if (ctx.isServer) {
            config.externals = [
                ...(config.externals || []),
                "aws4",
            ];
        }
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            aws4: false,
        };
        return config;
    },
};

export default nextConfig;
