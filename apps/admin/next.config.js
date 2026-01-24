/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@revalidation-tracker/shared-types', '@revalidation-tracker/ui', '@revalidation-tracker/utils', '@revalidation-tracker/constants'],
};

module.exports = nextConfig;
