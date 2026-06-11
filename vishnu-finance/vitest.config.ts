import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/free-tier-services.test.ts'],
    env: {
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long',
      GOOGLE_API_KEY: 'test-google-api-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
