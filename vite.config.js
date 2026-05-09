import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/webview-ui'),
  plugins: [
    preact({
      devToolsEnabled: false,
      prefreshEnabled: false,
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'out/webview-ui'),
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'src/webview-ui/index.html'),
      output: {
        entryFileNames: `main.js`,
        chunkFileNames: `main.js`,
        assetFileNames: `main.[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@': path.resolve(__dirname, './src/webview-ui'),
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', 'out/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['**/*'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.tsx',
        '**/*.html',
        '**/*.json',
        '**/*.css',
      ],
    },
  },
});
