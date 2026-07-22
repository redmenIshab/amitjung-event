'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'

type Props = {
  eventId: string
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED'
  isOpen: boolean
}

export function EventManageActions({ eventId, status, isOpen }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function patch(action: string, data: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(typeof d?.error === 'string' ? d.error : 'Update failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Update failed')
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'DRAFT' && (
        <Button size="sm" disabled={disabled} onClick={() => patch('publish', { status: 'PUBLISHED' })}>
          {busy === 'publish' ? 'Publishing…' : 'Publish'}
        </Button>
      )}
      {status === 'PUBLISHED' && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => patch('draft', { status: 'DRAFT' })}>
          Move to Draft
        </Button>
      )}
      {status === 'CANCELLED' && (
        <Button size="sm" disabled={disabled} onClick={() => patch('reactivate', { status: 'DRAFT' })}>
          Reactivate (Draft)
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => patch('reg', { isOpen: !isOpen })}
      >
        {isOpen ? 'Close registration' : 'Open registration'}
      </Button>
      {status !== 'CANCELLED' && (
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={() => patch('cancel', { status: 'CANCELLED' }, 'Cancel this event? It will be hidden from the public.')}
        >
          Cancel event
        </Button>
      )}
      <Link href={`/admin/events/${eventId}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        Edit details
      </Link>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </div>
  )
}
