import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/bildirim/aile/excel': ['./public/templates/**/*'],
    '/api/bildirim/mal/excel': ['./public/templates/**/*'],
  },
};

export default nextConfig;
