/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better Raspberry Pi performance
  output: 'standalone',
  
  // Optimize for production
  experimental: {
    // Disabled due to critters dependency issue
    // optimizeCss: true,
  },
  
  // Configure for network access
  async rewrites() {
    return []
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Images configuration
  images: {
    unoptimized: true,
  },
}

export default nextConfig
