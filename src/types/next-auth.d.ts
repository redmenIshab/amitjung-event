import NextAuth from 'next-auth'

type StaffRole = 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' | 'ORGANIZER'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: StaffRole | 'PARTICIPANT'
      /**
       * Events an event-scoped role may act on. Present only for ORGANIZER;
       * undefined for every other role, which means "not scoped", not "none".
       */
      eventIds?: string[]
    }
  }
  interface User {
    role: StaffRole
    /** Epoch ms of the last password reset, minted into the token at sign-in. */
    passwordChangedAt?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: StaffRole | 'PARTICIPANT'
    id: string
    eventIds?: string[]
    /**
     * The password stamp this token was minted with. Never refreshed, so a
     * reset permanently invalidates every session issued beforehand.
     */
    pwdAt?: number
  }
}
