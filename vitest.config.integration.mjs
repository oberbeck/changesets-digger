import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 60000, // Integration tests might take longer
    setupFiles: ['tests/setup.ts'],
    pool: 'forks', // Use child processes instead of worker threads
  },
});
