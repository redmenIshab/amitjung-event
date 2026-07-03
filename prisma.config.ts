import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma no longer auto-loads .env when a prisma.config.ts is present. On Vercel the
// env vars are injected directly, so this only matters for local CLI use (migrate, etc.).
// Zero-dependency loader so it can't break the build regardless of package-manager hoisting.
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key] !== undefined) continue
    let value = (match[2] ?? '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
