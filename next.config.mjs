/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better Raspberry Pi performance
  output: 'standalone',
  
  // Optimize for production
  experimental: {
    optimizeCss: true,
  },
  
  // Configure for network access
  async rewrites() {
    return []
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Images configuration
  images: {
    unoptimized: true,
  },
}

export default nextConfig
