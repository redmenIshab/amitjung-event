'use client'

import { useEffect, useState } from 'react'
import { site } from '@/data/site'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <a href="#top" className="nav-logo">
          AMIT<span>JUNG</span>
        </a>
        <div className="nav-links">
          <a href={site.lyanteUrl} target="_blank" rel="noreferrer">
            Lyante
          </a>
          <a href="#music">Music</a>
          <a href="#works">Works</a>
          <a href="#booking" className="nav-cta">
            Book a date
          </a>
        </div>
      </div>
    </nav>
  )
}
