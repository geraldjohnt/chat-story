/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Base path resolution:
 * - GitHub Pages project sites are served from /<repo>/.
 * - In GitHub Actions, GITHUB_REPOSITORY ("owner/repo") gives the repo name.
 * - BASE_PATH overrides everything (use "/" for a custom domain or user site).
 */
function resolveBase(command: 'build' | 'serve'): string {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  if (command === 'serve') return '/';
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'chat-story';
  return `/${repo}/`;
}

export default defineConfig(({ command }) => ({
  base: resolveBase(command),
  plugins: [react()],
  // Stories are copied into the build by scripts/copy-story-data.ts — never by Vite.
  publicDir: 'public',
  build: { outDir: process.env.OUT_DIR ?? 'dist', emptyOutDir: true, sourcemap: false },
  server: { fs: { strict: true } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
  },
}));
