'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { AuthShell, authInput, authLabel, authButton } from '@/components/auth/AuthShell'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <AuthShell
      eyebrow="Control Center"
      title="Admin Sign In"
      subtitle="Authorized personnel only."
      panelHeadline={
        <>
          Behind
          <br />
          the scenes.
        </>
      }
      panelSubcopy="Manage events, tickets, and analytics from the Lyante Control Center."
      footer={
        <span className="inline-flex items-center gap-1.5 text-ash text-xs">
          <ShieldCheck size={13} className="text-gold" />
          Secured access · Lyante staff
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabel}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@lyante.art"
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
            placeholder="••••••••"
            className={authInput}
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
              <Loader2 className="animate-spin" size={16} /> Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
