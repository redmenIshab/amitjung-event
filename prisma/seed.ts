import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Fetch admin credentials from .env, falling back to the defaults if unset.
  const email = process.env.ADMIN_EMAIL || 'admin@lyanteprod.com'
  const password = process.env.ADMIN_PASSWORD || 'LyanteProd@123'

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, name: 'Admin User', role: 'ADMIN' },
    create: {
      email,
      password: hash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
  console.log(`Seeded admin user: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
