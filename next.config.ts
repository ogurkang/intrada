import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  experimental: {
    /**
     * Denetim belgeleri artık tarayıcıdan doğrudan Storage'a gidiyor; bu sınır diğer
     * modüllerin (imza vb.) server action ile yüklediği küçük dosyalar için geçerli.
     * Vercel'de fonksiyon istek gövdesi zaten 4.5 MB ile sınırlıdır.
     */
    serverActions: { bodySizeLimit: "20mb" },
  },
  async redirects() {
    return [{ source: '/personel/gorev-bilgileri', destination: '/personel', permanent: true }]
  },
  turbopack: {
    resolveAlias: {
      /** unzipper 0.12+ optional S3 path — not used by ExcelJS xlsx read (relative path for Turbopack on Windows). */
      "@aws-sdk/client-s3": "./stubs/aws-sdk-client-s3.js",
    },
  },
  outputFileTracingIncludes: {
    '/api/bildirim/aile/excel': ['./public/templates/**/*'],
    '/api/bildirim/mal/excel': ['./public/templates/**/*'],
    '/api/bildirim/yari-zamanli-calisma/pdf': [
      './node_modules/pdfkit/js/data/**/*',
      './node_modules/dejavu-fonts-ttf/ttf/**/*',
    ],
  },
};

export default nextConfig;
