import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) return null
        // Deactivated accounts cannot obtain a fresh token.
        if (user.deletedAt) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // Google's profile includes `picture`, but the base NextAuth `Profile` type doesn't.
        const picture = (profile as { picture?: string } | undefined)?.picture ?? ''
        const participant = await prisma.participant.upsert({
          where: { email: profile?.email ?? '' },
          update: { name: profile?.name ?? '', image: picture },
          create: {
            googleId: account.providerAccountId,
            email: profile?.email ?? '',
            name: profile?.name ?? '',
            image: picture,
          },
        })
        user.id = participant.id
        return true
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          token.id = user.id
          token.role = 'PARTICIPANT'
        } else {
          token.id = user.id
          token.role = (user as { role: 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' }).role
        }
        return token
      }

      // Refresh path (no `user`): re-read the staff row so a role change or a
      // deactivation takes effect without waiting for the token to expire.
      // Buyers are skipped — PARTICIPANT lives in the Participant table and
      // never has a staff row to look up.
      if (token.role === 'PARTICIPANT' || !token.id) return token

      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, deletedAt: true },
      })

      // Deleted or deactivated collapses to USER, which holds no capability
      // (see CAPABILITY in src/lib/rbac.ts), so every existing gate rejects it.
      token.role = !current || current.deletedAt ? 'USER' : current.role

      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    },
  },
  pages: { signIn: '/admin/login' },
  session: { strategy: 'jwt' },
}
