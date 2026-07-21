import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('LyanteProd@123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@lyanteprod.com' },
    update: { password: hash, name: 'Admin User', role: 'ADMIN' },
    create: {
      email: 'admin@lyanteprod.com',
      password: hash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
  console.log('Seeded admin user: admin@lyanteprod.com / LyanteProd@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
