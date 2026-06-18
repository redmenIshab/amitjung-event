'use client'

import { useState } from 'react'
import Image from 'next/image'

const FILTERS = ['ALL', 'CONCERTS', 'CREATIVE'] as const
type Filter = typeof FILTERS[number]

const ITEMS: { id: number; category: Exclude<Filter, 'ALL'>; title: string; image: string; tall: boolean }[] = [
  { id: 2,  category: 'CREATIVE',  title: 'Xtreme Action Shot',    image: '/images/photo-2.jpg',  tall: true  },
  { id: 3,  category: 'CREATIVE',  title: 'Xtreme Action Shot',   image: '/images/photo-4.jpg',  tall: false },
  { id: 4,  category: 'CREATIVE',  title: 'Xtreme Action Shot',         image: '/images/photo-5.jpg',  tall: true  },
  { id: 5,  category: 'CREATIVE',  title: 'Xtreme Action Shot',image: '/images/photo-6.jpg',  tall: false },
  { id: 6,  category: 'CREATIVE',  title: 'Xtreme Action Shot',       image: '/images/photo-7.jpg',  tall: true  },
  { id: 7,  category: 'CREATIVE',  title: 'Xtreme Action Shot',    image: '/images/photo-8.jpg',  tall: false },
  { id: 8,  category: 'CREATIVE',  title: 'Xtreme Action Shot',        image: '/images/photo-9.jpg',  tall: true  },
  { id: 9,  category: 'CREATIVE',  title: 'Xtreme Action Shot',       image: '/images/photo-10.jpg', tall: false },
  { id: 10, category: 'CONCERTS',  title: 'Amit Jung & Gorkhey',  image: '/images/photo-11.jpg', tall: false },
  { id: 11, category: 'CREATIVE',  title: 'Xtreme Action Shot',        image: '/images/photo-12.jpg', tall: true  },
  { id: 12, category: 'CREATIVE',  title: 'Xtreme Action Shot',     image: '/images/photo-14.jpg', tall: false },
]

export default function Portfolio() {
  const [active, setActive] = useState<Filter>('ALL')
  const filtered = active === 'ALL' ? ITEMS : ITEMS.filter((i) => i.category === active)

  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="work">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">OUR WORK</p>
        <h2 className="font-cormorant font-bold text-ivory mb-10" style={{ fontSize: 'var(--t-display)' }}>
          Portfolio
        </h2>

        {/* Video showreel */}
        <div className="relative w-full h-64 md:h-96 bg-surface mb-10 rounded-sm overflow-hidden group">
          <video
            src="/video/showreel.mov"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-bg/30 group-hover:bg-bg/10 transition-all duration-300" />
          <div className="absolute bottom-4 left-4">
            <p className="section-label">SHOWREEL</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-10">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`font-bebas text-sm tracking-widest px-4 py-2 min-h-[48px] border transition-all duration-200 ${
                active === f
                  ? 'border-gold bg-gold text-bg'
                  : 'border-coal text-ash hover:border-gold hover:text-gold'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        <div className="columns-1 md:columns-3 gap-4 space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`relative ${item.tall ? 'h-72' : 'h-48'} rounded-sm overflow-hidden group break-inside-avoid`}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-bg/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-4">
                <p className="font-cormorant italic text-gold text-xl text-center">{item.title}</p>
                <p className="section-label">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
