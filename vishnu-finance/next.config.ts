import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Enable modern React features
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
    // Faster builds (moved to turbopack)
    // turbo: {
    //   rules: {
    //     '*.svg': {
    //       loaders: ['@svgr/webpack'],
    //       as: '*.js',
    //     },
    //   },
    // },
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Bundle analyzer (optional - remove in production)
  // bundleAnalyzer: process.env.ANALYZE === 'true',
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Production optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Enable SWC minification for faster builds (default in Next.js 15)
  // swcMinify: true,
  
  // Optimize CSS (default in Next.js 15)
  // optimizeFonts: true,
  
  // Enable compression
  compress: true,
  
  // Cache optimization
  generateEtags: false,
  
  // Faster development
  reactStrictMode: false, // Disable in dev for faster reloads
  
  // Turbopack configuration (Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
