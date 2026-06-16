import ServiceCard from '@/components/marketing/ui/ServiceCard'

const SERVICES = [
  {
    number: '01', label: 'PRE-PRODUCTION', title: 'Pre-Production',
    body: 'Strategy, storytelling, and buzz building before day one.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="8" width="20" height="16" rx="1" /><path d="M4 12h20M14 8v4" /><circle cx="25" cy="9" r="3" /><path d="M23.5 9l1 1 2-2" strokeWidth="1.2" /></svg>,
  },
  {
    number: '02', label: 'EVENT DAY', title: 'Event Day Coverage',
    body: 'Behind the scenes, on-set, capturing every raw moment.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="5" /><circle cx="16" cy="16" r="2" fill="currentColor" /></svg>,
  },
  {
    number: '03', label: 'POST-PRODUCTION', title: 'Post-Production',
    body: 'Cinematic edits, sponsor coverage, and highlight reels.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="10" width="24" height="14" rx="1" /><path d="M10 10V6M22 10V6M4 16h24" /><circle cx="16" cy="20" r="2" /></svg>,
  },
  {
    number: '04', label: 'DOCUMENTATION', title: 'Lifetime Documentation',
    body: 'A full journey journal for organizers, preserved forever.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="4" width="20" height="24" rx="1" /><path d="M10 10h12M10 15h12M10 20h8" /></svg>,
  },
  {
    number: '05', label: 'TICKETING', title: 'Smart Ticketing',
    body: 'Unique one-time QR codes, digital payment, zero duplicates.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="10" height="10" rx="1" /><rect x="18" y="4" width="10" height="10" rx="1" /><rect x="4" y="18" width="10" height="10" rx="1" /><path d="M18 18h4v4h-4zM22 22h4v4h-4z" /></svg>,
  },
  {
    number: '06', label: 'BRANDING', title: 'Creative & Branding',
    body: 'Business branding, content creation, and marketing partnerships.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" /></svg>,
  },
]

export default function Services() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="services">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-12">
          <p className="section-label mb-3">WHAT WE DO</p>
          <h2 className="font-cormorant font-bold text-ivory" style={{ fontSize: 'var(--t-display)' }}>
            Our Services
          </h2>
        </div>
        <div
          className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-4 md:pb-0"
        >
          {SERVICES.map((s) => (
            <div key={s.number} className="snap-start shrink-0 w-[85vw] md:w-auto">
              <ServiceCard {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
