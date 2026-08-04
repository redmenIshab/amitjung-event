'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { assignableRoles, MIN_STAFF_PASSWORD_LENGTH } from '@/types/user'

const ROLE_HINTS: Record<string, string> = {
  ADMIN: 'Full access, including events, tickets, artists and user management.',
  MANAGER: 'Dashboard, analytics and marketing. Cannot scan tickets or edit events.',
  STAFF: 'Dashboard, analytics and ticket scanning at the door.',
}

/** Password the admin can hand over — avoids look-alike characters (0/O, 1/l/I). */
function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

type Created = { name: string; email: string; emailSent: boolean; password?: string }

export function NewUserForm({ emailEnabled }: { emailEnabled: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as (typeof assignableRoles)[number],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      const flat = data.error?.fieldErrors as Record<string, string[]> | undefined
      setError(
        flat
          ? Object.values(flat).flat().join(', ')
          : typeof data.error === 'string'
            ? data.error
            : 'Failed to create user',
      )
      return
    }

    setCreated({
      name: data.user.name,
      email: data.user.email,
      emailSent: data.emailSent,
      password: data.password,
    })
  }

  // Success panel. When mail did not go out the password is shown once — this is
  // the only chance to capture it, so we do not auto-navigate away.
  if (created) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>User created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{created.name}</strong> ({created.email}) can now sign in at{' '}
              <code>/admin/login</code>.
            </p>

            {created.emailSent ? (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                Their credentials have been emailed to {created.email}.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {emailEnabled
                    ? 'The credentials email failed to send. Copy the password now — it cannot be shown again.'
                    : 'Email is disabled on this environment. Copy the password now — it cannot be shown again.'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm bg-gray-100 rounded-md px-3 py-2 break-all">
                    {created.password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copy password"
                    onClick={() => {
                      navigator.clipboard.writeText(created.password ?? '')
                      setCopied(true)
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Link href="/admin/users" className="flex-1">
                <Button
                  className="w-full"
                  onClick={() => router.refresh()}
                >
                  Back to users
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setCreated(null)
                  setCopied(false)
                  setForm({ name: '', email: '', password: '', role: 'STAFF' })
                }}
              >
                Add another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">
                Used to sign in. It cannot be changed afterwards.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as (typeof assignableRoles)[number] })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">{ROLE_HINTS[form.role]}</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={MIN_STAFF_PASSWORD_LENGTH}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Generate password"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                At least {MIN_STAFF_PASSWORD_LENGTH} characters.{' '}
                {emailEnabled
                  ? 'It will be emailed to them.'
                  : 'Email is off, so it will be shown once for you to pass on.'}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
