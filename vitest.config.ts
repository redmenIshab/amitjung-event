import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // `.claude/worktrees/` holds checkouts of this same repo; without this,
    // every run executes a second, stale copy of the suite and reports its
    // pre-existing failures as ours.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` throws by design outside a react-server condition, which
      // is exactly what makes it a useful build-time guard — and exactly what
      // would stop a Node test importing any module that uses it. Stubbed so
      // the guard stays real in the build without blinding the suite.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
})
