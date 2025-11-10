import type { NextConfig } from "next";

const outputMode = process.env.NEXT_OUTPUT_MODE === 'export' ? 'export' : undefined;

const nextConfig: NextConfig = {
  ...(outputMode ? { output: outputMode } : {}),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Performance optimizations
  experimental: {
    // Enable modern React features and tree-shaking optimizations
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
    // Enable faster Fast Refresh in development
    optimizeCss: true,
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 20,
              chunks: 'all',
            },
            // React, ReactDOM, and Next.js
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              name: 'framework',
              priority: 30,
              chunks: 'all',
            },
            // Common UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui',
              priority: 25,
              chunks: 'all',
            },
            // Common chunk for shared code
            common: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Enable compression
  compress: true,
  
  // Cache optimization
  generateEtags: true,
  
  // Enable React Strict Mode - helps catch bugs in development
  // This is critical for production performance
  reactStrictMode: true,
  
  // Turbopack configuration (Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Power saving for mobile devices
  poweredByHeader: false,
};

export default nextConfig;
