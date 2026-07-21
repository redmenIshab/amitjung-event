import Nav from '@/components/marketing/layout/Nav'
import Hero from '@/components/marketing/sections/Hero'
import Manifesto from '@/components/marketing/sections/Manifesto'
import Services from '@/components/marketing/sections/Services'
import ProcessTimeline from '@/components/marketing/sections/ProcessTimeline'
import TicketingCallout from '@/components/marketing/sections/TicketingCallout'
import Portfolio from '@/components/marketing/sections/Portfolio'
import Testimonials from '@/components/marketing/sections/Testimonials'
import Contact from '@/components/marketing/sections/Contact'

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Manifesto />
      <Services />
      <ProcessTimeline />
      <TicketingCallout />
      <Portfolio />
      <Testimonials />
      <Contact />
    </>
  )
}
