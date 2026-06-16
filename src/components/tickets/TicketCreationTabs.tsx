'use client'

import { useState } from 'react'
import { TicketForm } from '@/components/tickets/TicketForm'
import { BulkTicketForm } from '@/components/tickets/BulkTicketForm'
import { DistributorTicketForm } from '@/components/tickets/DistributorTicketForm'

type Tab = 'single' | 'bulk' | 'distributor'

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'single', label: 'Single', description: 'One named attendee with email' },
  { id: 'bulk', label: 'Bulk CSV', description: 'Upload or paste a list of attendees' },
  { id: 'distributor', label: 'Distributor Batch', description: 'Generate X tickets under one name' },
]

export function TicketCreationTabs({
  eventId,
  eventName,
  eventVenue,
  eventDate,
  emailEnabled = false,
}: {
  eventId: string
  eventName: string
  eventVenue?: string
  eventDate?: string
  emailEnabled?: boolean
}) {
  const [tab, setTab] = useState<Tab>('single')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
              tab === t.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t.label}
            {tab !== t.id && (
              <span className="hidden sm:block text-xs font-normal opacity-60 mt-0.5">
                {t.description}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <TicketForm
          eventId={eventId}
          eventName={eventName}
          eventVenue={eventVenue}
          eventDate={eventDate}
          emailEnabled={emailEnabled}
        />
      )}
      {tab === 'bulk' && <BulkTicketForm eventId={eventId} eventName={eventName} />}
      {tab === 'distributor' && <DistributorTicketForm eventId={eventId} eventName={eventName} />}
    </div>
  )
}
