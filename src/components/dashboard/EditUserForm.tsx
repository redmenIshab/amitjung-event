'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { assignableRoles, type AssignableRole } from '@/types/user'
import type { StaffUserDto } from '@/types/user'

/**
 * A self-registered account arrives as USER, which is not assignable. Offer it
 * as a read-only current value so the select has something valid to show until
 * an admin promotes them.
 */
function roleOptions(current: string): string[] {
  return (assignableRoles as readonly string[]).includes(current)
    ? [...assignableRoles]
    : [current, ...assignableRoles]
}

export function EditUserForm({
  user,
  isSelf,
  isLastAdmin,
}: {
  user: StaffUserDto
  isSelf: boolean
  isLastAdmin: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [active, setActive] = useState(user.active)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const roleLocked = isSelf || isLastAdmin
  const activeLocked = isSelf || isLastAdmin
  const dirty = name !== user.name || role !== user.role || active !== user.active

  async function save() {
    setLoading(true)
    setError('')
    setSaved(false)

    const body: { name?: string; role?: AssignableRole; active?: boolean } = {}
    if (name !== user.name) body.name = name
    if (role !== user.role) body.role = role as AssignableRole
    if (active !== user.active) body.active = active

    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Update failed')
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isSelf || isLastAdmin) && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {isSelf
                ? 'This is your own account, so its role and access cannot be changed here.'
                : 'This is the last active admin. Promote another admin before changing this one.'}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user.email} disabled />
            <p className="text-xs text-gray-500">Email is the login identifier and is fixed.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              disabled={roleLocked}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {roleOptions(user.role).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {active ? 'Active' : 'Deactivated'}
              </p>
              <p className="text-xs text-gray-500">
                Deactivating revokes access on their next request.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={activeLocked}
              onClick={() => setActive((a) => !a)}
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">Changes saved.</p>}

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={!dirty || loading} onClick={save}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
            <Link href="/admin/users">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
