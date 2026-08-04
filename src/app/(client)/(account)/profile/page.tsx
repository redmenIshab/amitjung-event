'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { AccountHeader } from '@/components/tickets/AccountHeader'

interface Profile {
  name: string
  email: string
  image: string | null
  accountType: string
  signInMethod: string
  memberSince: string
  ticketCount: number | null
}

/** Two-letter monogram, used when the account has no avatar (credential sign-ups). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between py-3.5 border-b border-white/[0.07] last:border-0">
      <dt className="text-[11px] uppercase tracking-[0.22em] text-ash">{label}</dt>
      <dd className="text-ivory sm:text-right break-all">{value}</dd>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { status } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=%2Fprofile')
      return
    }
    if (status !== 'authenticated') return

    fetch('/api/profile')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(setProfile)
      .catch(() => setError('We could not load your profile. Please try again.'))
  }, [status, router])

  if (status === 'loading' || (!profile && !error)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-24">
      <AccountHeader title="Profile" />

      {error ? (
        <div className="text-center py-16">
          <p className="text-ash">{error}</p>
        </div>
      ) : (
        profile && (
          <>
            <section className="flex items-center gap-4 md:gap-5 mb-8">
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.image}
                  alt=""
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border border-gold/30"
                />
              ) : (
                <div
                  aria-hidden
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-gold/30 bg-lyante-surface flex items-center justify-center font-bebas text-2xl md:text-3xl text-gold"
                >
                  {initials(profile.name)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-bebas text-2xl md:text-3xl tracking-wide text-ivory uppercase truncate">
                  {profile.name}
                </h2>
                <p className="text-ash text-sm truncate">{profile.email}</p>
              </div>
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-lyante-surface/60 px-5 md:px-6 py-2 mb-6">
              <dl>
                <Row label="Name" value={profile.name} />
                <Row label="Email" value={profile.email} />
                <Row label="Account" value={profile.accountType} />
                <Row label="Sign-in method" value={profile.signInMethod} />
                <Row
                  label="Member since"
                  value={new Date(profile.memberSince).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
                {profile.ticketCount !== null && (
                  <Row
                    label="Tickets"
                    value={profile.ticketCount === 1 ? '1 ticket' : `${profile.ticketCount} tickets`}
                  />
                )}
              </dl>
            </section>

            <p className="flex items-start gap-2.5 text-xs text-coal mb-6 leading-relaxed">
              <ShieldCheck size={15} className="text-coal shrink-0 mt-px" />
              These details come from your account and are only visible to you.
            </p>

            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true)
                signOut({ callbackUrl: '/' })
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-bebas text-sm tracking-widest uppercase border border-gold/60 text-gold hover:bg-gold hover:text-lyante-bg transition-colors duration-250 min-h-[48px] disabled:opacity-60"
            >
              <LogOut size={16} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        )
      )}
    </main>
  )
}
