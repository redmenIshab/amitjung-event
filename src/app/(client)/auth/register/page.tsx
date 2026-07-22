'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, authInput, authLabel, authButton } from '@/components/auth/AuthShell'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/auth/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    await signIn('credentials', { email, password, redirect: false })
    router.push(callbackUrl)
  }

  return (
    <AuthShell
      eyebrow="Join Lyante"
      title="Create Account"
      subtitle="One account for every Lyante experience."
      panelHeadline={
        <>
          Your seat
          <br />
          awaits.
        </>
      }
      panelSubcopy="Create an account to book tickets, keep them in one place, and never miss a Lyante night."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-gold hover:text-gold-light underline underline-offset-4 transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={authLabel}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={authInput}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className={authLabel}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInput}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={authInput}
            minLength={6}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Creating…
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-lyante-bg" />}>
      <RegisterForm />
    </Suspense>
  )
}
