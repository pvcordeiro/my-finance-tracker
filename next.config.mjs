/** @type {import('next').NextConfig} */
const nextConfig = {
  //
  output: "standalone",

  experimental: {
    optimizeCss: true,
  },

  async rewrites() {
    return [];
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
