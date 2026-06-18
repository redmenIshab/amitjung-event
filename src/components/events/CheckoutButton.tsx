'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Ticket } from 'lucide-react'

type Props = {
  eventId: string
  finalPrice: number
  discountActive: boolean
  baseTicketPrice: number
}

export function CheckoutButton({ eventId, finalPrice, discountActive, baseTicketPrice }: Props) {
  const { data: session } = useSession()
  const router = useRouter()

  function handleClick() {
    if (!session) {
      signIn(undefined, { callbackUrl: `/events/${eventId}` })
      return
    }
    router.push(`/events/${eventId}/checkout`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full bg-[#ffb0cc] text-[#640038] font-bold py-3 md:py-4 flex items-center justify-center gap-3 hover:opacity-90 transition-all group cursor-pointer"
    >
      <Ticket size={18} />
      <span className="font-bold text-[16px] md:text-[20px] uppercase flex items-center gap-2">
        {discountActive ? (
          <>
            <span className="line-through text-white/40 text-[14px] md:text-[16px]">Rs. {baseTicketPrice.toLocaleString()}</span>
            <span>Rs. {finalPrice.toLocaleString()}</span>
          </>
        ) : (
          <span>Secure Tickets — Rs. {finalPrice.toLocaleString()}</span>
        )}
      </span>
    </button>
  )
}
