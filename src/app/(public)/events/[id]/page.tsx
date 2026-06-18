import { notFound } from 'next/navigation'
import Image from 'next/image'
import { eventDetailSchema } from '@/types/event'
import { CheckoutButton } from '@/components/events/CheckoutButton'

type Props = { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Props) {
    const { id } = await params

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/events/${id}`)

    if (!res.ok) notFound()

    const raw = await res.json()
    const parsed = eventDetailSchema.safeParse(raw)

    if (!parsed.success) notFound()

    console.log(parsed)
    const event = parsed.data
    const artist = event.artist
    const now = new Date()
    const discountActive = event.hasDiscount && event.discountUpto !== null && new Date(event.discountUpto) > now
    const finalPrice = discountActive
        ? event.baseTicketPrice * (1 - event.discountPercentage / 100)
        : event.baseTicketPrice

    return (
        <main className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0A0A0A]">
            {/* ══ Left Panel (60%) — Hero ══ */}
            <section className="relative w-full md:w-[50%] h-[50vh] md:h-full flex flex-col justify-end">
                {event.image && (
                    <Image
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        src={event.image}
                        fill
                        sizes="60vw"
                        priority
                        unoptimized
                    />
                )}
                <div className="relative z-10 p-6 md:p-12 bg-gradient-to-t from-black/80 via-black/20 to-transparent w-full">
                    <h1 className="text-[40px] md:text-[52px] font-extrabold text-white uppercase leading-[0.9] max-w-[400px] mb-8">
                        {event.name}
                    </h1>
                    {artist && (
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 md:p-4 flex items-start gap-4 w-full max-w-full">
                            <div className="w-14 h-14 md:w-20 md:h-20 bg-[#36252b] shrink-0 border border-white/10 overflow-hidden">
                                <Image
                                    alt={artist.artistName}
                                    className="w-full h-full object-cover grayscale"
                                    src={artist.artistImage}
                                    width={80}
                                    height={80}
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="relative pt-4">
                                    <div className="relative h-1 bg-white/20 w-full">
                                        <div className="absolute top-0 left-0 h-full bg-[#ffb0cc] w-[45%]" />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-white/40 mt-1">
                                        <span>1:45</span>
                                        <span>3:40</span>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between'>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-[12px] md:text-[14px] uppercase tracking-wider">
                                            {artist.artistName}
                                        </span>
                                        <span className="text-white/60 text-[10px] md:text-[11px] uppercase tracking-widest">
                                            {artist.artistBand}
                                        </span>
                                    </div>
                                    <div className="flex justify-center mt-1">
                                        <button className="text-white hover:text-[#ffb0cc] transition-colors cursor-pointer">
                                            <span className="text-[28px] md:text-[32px] leading-none">▶</span>
                                        </button>
                                    </div>
                                </div>



                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══ Right Panel (40%) — Lineup + Ticket CTA ══ */}
            <aside className="w-full md:w-[50%] h-[50vh] md:h-full bg-[#0A0A0A] flex flex-col pt-6 overflow-hidden">
                <div className="px-4 md:px-8 mb-2 md:mb-4">
                    <h2 className="text-[22px] md:text-[28px] text-white uppercase font-bold tracking-tight">
                        LINEUP
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-32 space-y-1">
                    {artist ? (
                        <>

                            {artist.musics.length > 0 && artist.musics.map((music) => (
                                <div key={music.id} className="flex items-center justify-between py-4 border-b border-[#1C1C1C] hover:bg-[#141414] transition-colors group px-2 -mx-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-[6px] overflow-hidden">
                                            <Image
                                                alt={artist.artistName}
                                                className="w-full h-full object-cover grayscale"
                                                src={artist.artistImage}
                                                width={48}
                                                height={48}
                                                unoptimized
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] md:text-[14px] text-white font-bold uppercase tracking-wide">
                                                {music.musicTitle}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-[#9A9A9A] text-sm text-center pt-8">No artists assigned yet.</p>
                    )}
                </div>

                {/* Sticky Ticket CTA */}
                <div className="px-4 md:px-8 pb-6 pt-4 border-t border-[#1C1C1C]">
                    <CheckoutButton
                        eventId={id}
                        finalPrice={finalPrice}
                        discountActive={discountActive}
                        baseTicketPrice={event.baseTicketPrice}
                    />
                </div>
            </aside>
        </main>
    )
}
