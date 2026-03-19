import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/bildirim/aile/excel': ['./public/templates/**/*'],
  },
};

export default nextConfig;
