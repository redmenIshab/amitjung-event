import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' | 'PARTICIPANT'
    }
  }
  interface User {
    role: 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' | 'PARTICIPANT'
    id: string
  }
}
