'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Ticket } from 'lucide-react'

type Props = {
  eventId: string
  finalPrice: number
  discountActive: boolean
  baseTicketPrice: number
  disabled?: boolean
  disabledReason?: string | null
}

export function CheckoutButton({
  eventId,
  finalPrice,
  discountActive,
  baseTicketPrice,
  disabled = false,
  disabledReason,
}: Props) {
  const { status } = useSession()
  const router = useRouter()

  function handleClick() {
    const checkout = `/booking/${eventId}/checkout`
    // Unauthenticated → straight to the auth flow, returning to checkout after.
    // Authenticated (or still resolving) → go to checkout, which gates itself.
    if (status === 'unauthenticated') {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(checkout)}`)
    } else {
      router.push(checkout)
    }
  }

  if (disabled) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-bold py-3 md:py-4 flex items-center justify-center gap-3 cursor-not-allowed"
      >
        <Ticket size={18} />
        <span className="font-bold text-[15px] md:text-[18px] uppercase">
          {disabledReason ?? 'Unavailable'}
        </span>
      </button>
    )
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
