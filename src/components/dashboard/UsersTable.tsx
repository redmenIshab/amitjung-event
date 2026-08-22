'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import type { StaffUserDto } from '@/types/user'

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-gold/15 text-gold-deep',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-emerald-100 text-emerald-700',
  USER: 'bg-gray-100 text-gray-500',
  ORGANIZER: 'bg-purple-100 text-purple-700',
}

export function UsersTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: StaffUserDto[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const q = search.toLowerCase()
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  )

  async function toggleActive(user: StaffUserDto) {
    const next = !user.active
    if (!next && !confirm(`Deactivate ${user.name}? They will lose access immediately.`)) return

    setBusyId(user.id)
    setError('')
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
    const data = await res.json()
    setBusyId(null)

    if (!res.ok) {
      // The server owns the last-admin and self-lockout rules; surface its reason.
      setError(typeof data.error === 'string' ? data.error : 'Update failed')
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Staff accounts with Control Center access. Self-registered accounts appear as USER and
            hold no access.
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <Plus size={16} />
            New User
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const isSelf = user.id === currentUserId
                return (
                  <TableRow key={user.id} className={user.active ? '' : 'opacity-55'}>
                    <TableCell className="font-medium">
                      {user.name}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider ${
                          ROLE_STYLES[user.role] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.role}
                      </span>
                      {user.role === 'ORGANIZER' && user.assignedEvents !== undefined && (
                        <span
                          className={`ml-2 text-[11px] ${
                            user.assignedEvents === 0 ? 'text-amber-700' : 'text-gray-500'
                          }`}
                        >
                          {user.assignedEvents === 0
                            ? 'no events assigned'
                            : `${user.assignedEvents} event${user.assignedEvents === 1 ? '' : 's'}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[11px] uppercase font-semibold tracking-wider ${
                          user.active ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {user.active ? 'Active' : 'Deactivated'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="outline" size="icon" aria-label={`Edit ${user.name}`}>
                            <Pencil size={14} />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isSelf || busyId === user.id}
                          title={isSelf ? 'You cannot deactivate your own account' : undefined}
                          aria-label={`${user.active ? 'Deactivate' : 'Reactivate'} ${user.name}`}
                          onClick={() => toggleActive(user)}
                        >
                          {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
