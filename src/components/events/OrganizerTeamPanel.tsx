'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StaffUserDto } from '@/types/user'

/**
 * Admin-only panel for the event's organizer team. Rendered behind
 * USER_MANAGE — the API enforces the same capability, so hiding it is
 * cosmetic.
 */
export function OrganizerTeamPanel({
  eventId,
  initialMembers,
}: {
  eventId: string
  initialMembers: StaffUserDto[]
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Shown once when mail is disabled — otherwise the password is unrecoverable. */
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)
  /**
   * Existing organizer accounts. A team can span events, so a returning
   * organizer must be assignable rather than re-created — creating them again
   * would just collide on the unique email.
   */
  const [existing, setExisting] = useState<StaffUserDto[]>([])
  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  useEffect(() => {
    if (!adding) return
    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : []))
      .then((all: StaffUserDto[]) =>
        setExisting(all.filter((u) => u.role === 'ORGANIZER' && u.active)),
      )
      .catch(() => {})
  }, [adding])

  const assignable = existing.filter((u) => !members.some((m) => m.id === u.id))

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIssuedPassword(null)

    const form = new FormData(e.currentTarget)
    const payload =
      mode === 'existing'
        ? { userId: form.get('userId') as string }
        : {
            name: form.get('name') as string,
            email: form.get('email') as string,
            password: form.get('password') as string,
          }

    const res = await fetch(`/api/events/${eventId}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      setMembers((m) => [...m, data.user])
      if (data.password) setIssuedPassword(data.password)
      setAdding(false)
      router.refresh()
    } else {
      let message = 'Failed to add team member'
      try {
        const data = await res.json()
        if (typeof data.error === 'string') message = data.error
      } catch {}
      setError(message)
    }
    setLoading(false)
  }

  async function handleRemove(userId: string) {
    setError('')
    const res = await fetch(`/api/events/${eventId}/team/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers((m) => m.filter((x) => x.id !== userId))
      router.refresh()
    } else {
      setError('Failed to remove team member')
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Organizer team</h2>
          <p className="text-xs text-gray-500">
            Read-only access to this event, plus ticket scanning for it.
          </p>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus size={14} className="mr-1.5" />
            Add member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">No organizer accounts on this event yet.</p>
      ) : (
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {m.name}
                  {!m.active && <span className="text-xs text-red-600 ml-2">deactivated</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {m.email} · {m.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md transition-colors shrink-0"
                aria-label={`Remove ${m.name}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {issuedPassword && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Email is disabled, so pass this on now — it cannot be shown again:{' '}
          <span className="font-mono font-semibold">{issuedPassword}</span>
        </p>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-3 border-t pt-3">
          <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 text-xs">
            {(['existing', 'new'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {m === 'existing' ? 'Existing account' : 'New account'}
              </button>
            ))}
          </div>

          {mode === 'existing' ? (
            <div className="space-y-1">
              <Label htmlFor="team-userId">Organizer account</Label>
              <select
                id="team-userId"
                name="userId"
                required
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="" disabled>
                  {assignable.length === 0 ? 'No unassigned organizers' : 'Select an account…'}
                </option>
                {assignable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Organizer accounts already in the system, not yet on this event.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="team-name">Name</Label>
                <Input id="team-name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-email">Email</Label>
                <Input id="team-email" name="email" type="email" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-password">Temporary password</Label>
                <Input id="team-password" name="password" type="text" minLength={8} required />
                <p className="text-xs text-gray-500">
                  At least 8 characters. There is no reset flow yet, so record it.
                </p>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Adding…' : 'Add to team'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && !adding && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
