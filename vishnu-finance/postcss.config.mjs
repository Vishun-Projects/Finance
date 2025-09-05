const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Performance optimizations
      flexbox: 'no-2009',
      grid: 'autoplace',
    },
    // Add CSS optimization plugins
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: false,
        }],
      },
    }),
  },
};

export default config;
