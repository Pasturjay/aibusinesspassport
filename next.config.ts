import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withSentryConfig(nextConfig, {
  // Sentry Webpack Plugin options
  org: process.env.SENTRY_ORG || "fecund-integrated",
  project: process.env.SENTRY_PROJECT || "ai-business-passport",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
