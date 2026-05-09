import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.host.test.ts'],
    exclude: ['**/node_modules/**', 'out/**', 'src/webview-ui/**'],
  },
});
