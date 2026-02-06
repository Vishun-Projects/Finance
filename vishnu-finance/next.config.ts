import type { NextConfig } from "next";

const outputMode = process.env.NEXT_OUTPUT_MODE === 'export' ? 'export' : undefined;

const nextConfig: NextConfig = {
  ...(outputMode ? { output: outputMode } : {}),
  ...(outputMode ? { output: outputMode } : {}),
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
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
    // Use webpack's IgnorePlugin to ignore .node binary files
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.node$/,
      })
    );

    // Mark native modules as external for server builds
    if (isServer) {
      const originalExternals = config.externals;

      // Create a function to handle externals
      const externalHandler = ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        // Exclude @napi-rs/canvas and its native dependencies
        // Exclude @napi-rs/canvas logic removed


        // Call original externals handler if it exists
        if (typeof originalExternals === 'function') {
          return originalExternals({ request }, callback);
        }

        callback();
      };

      // Set externals based on current type
      if (Array.isArray(originalExternals)) {
        config.externals = [...originalExternals, externalHandler];
      } else if (typeof originalExternals === 'function') {
        config.externals = [originalExternals, externalHandler];
      } else {
        config.externals = [originalExternals, externalHandler].filter(Boolean);
      }
    }

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
