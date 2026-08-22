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
    },
  },
})
