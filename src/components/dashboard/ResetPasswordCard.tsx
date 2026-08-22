'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MIN_STAFF_PASSWORD_LENGTH } from '@/types/user'

/**
 * Admin password reset.
 *
 * There is no self-service forgot-password flow, so this is the only route back
 * into a locked-out staff account. Resetting also ends that account's existing
 * sessions, which the copy states plainly — including when the admin resets
 * their own, where the sign-out is immediate and would otherwise be baffling.
 */
export function ResetPasswordCard({
  userId,
  userName,
  isSelf,
}: {
  userId: string
  userName: string
  isSelf: boolean
}) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Shown once when mail is off — it cannot be recovered afterwards. */
  const [issued, setIssued] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_STAFF_PASSWORD_LENGTH

  async function reset() {
    setLoading(true)
    setError('')
    setIssued(null)
    setSent(false)

    const res = await fetch(`/api/users/${userId}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      const data = await res.json()
      setPassword('')
      if (data.password) setIssued(data.password)
      else setSent(true)
      if (data.signedOutSelf) {
        // Their own token no longer matches the account, so every subsequent
        // request is already unauthenticated. Send them to sign in rather than
        // letting the next click fail on its own.
        router.push('/admin/login')
        return
      }
      router.refresh()
    } else {
      let message = 'Failed to reset the password'
      try {
        const data = await res.json()
        if (typeof data.error === 'string') message = data.error
      } catch {}
      setError(message)
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound size={16} />
          Reset password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">
          {isSelf
            ? 'Sets a new password for your own account. You will be signed out immediately and will need to sign in again.'
            : `Sets a new password for ${userName}. Any session they currently have open is ended.`}
        </p>

        <div className="space-y-1">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_STAFF_PASSWORD_LENGTH} characters`}
            minLength={MIN_STAFF_PASSWORD_LENGTH}
            autoComplete="off"
          />
          {tooShort && (
            <p className="text-xs text-amber-700">
              At least {MIN_STAFF_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {sent && (
          <p className="text-sm text-emerald-700">
            Password reset and emailed to the account.
          </p>
        )}
        {issued && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Email is disabled, so pass this on now — it cannot be shown again:{' '}
            <span className="font-mono font-semibold">{issued}</span>
          </p>
        )}

        <Button
          variant="outline"
          className="w-full"
          disabled={loading || password.length < MIN_STAFF_PASSWORD_LENGTH}
          onClick={reset}
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
      </CardContent>
    </Card>
  )
}
