import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [
    preact({
      devToolsEnabled: false,
      prefreshEnabled: false,
    }),
  ],
  build: {
    outDir: 'out/webview-ui',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/webview-ui/index.html'),
      },
      output: {
        entryFileNames: `main.js`,
        chunkFileNames: `main.js`,
        assetFileNames: `main.[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/webview-ui'),
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/webview-ui/**/*'],
      exclude: [
        'src/webview-ui/**/*.test.ts',
        'src/webview-ui/**/*.test.tsx',
        'src/webview-ui/index.tsx',
        'src/webview-ui/**/*.html',
        'src/webview-ui/**/*.json',
        'src/webview-ui/**/*.css',
      ],
    },
  },
});
