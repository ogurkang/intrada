import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      /** unzipper 0.12+ optional S3 path — not used by ExcelJS xlsx read (relative path for Turbopack on Windows). */
      "@aws-sdk/client-s3": "./stubs/aws-sdk-client-s3.js",
    },
  },
  outputFileTracingIncludes: {
    '/api/bildirim/aile/excel': ['./public/templates/**/*'],
    '/api/bildirim/mal/excel': ['./public/templates/**/*'],
  },
};

export default nextConfig;
