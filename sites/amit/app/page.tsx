import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Reveal from '@/components/Reveal'
import Booking from '@/components/Booking'
import { site } from '@/data/site'

export default function Page() {
  const marquee = (
    <span className="marquee-item">
      {[
        site.album,
        'Live at Moksh',
        'The Kathmandu Post',
        'Barsa Bhayecha Nepal Nafarkeko',
        'Kathmandu · Lalitpur · Worldwide',
      ].map((t, i) => (
        <span key={i}>
          {t} <i>◆</i>
        </span>
      ))}
    </span>
  )

  return (
    <main className="grain">
      <Nav />
      <Hero />

      {/* marquee */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {marquee}
          {marquee}
        </div>
      </div>

      {/* stats */}
      <section id="about">
        <div className="wrap">
          <Reveal>
            <div className="stats">
              {site.stats.map((s) => (
                <div className="stat" key={s.l}>
                  <b>{s.n}</b>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* music */}
      <section id="music" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">Music</p>
            <h2>Songs about home, distance and return</h2>
            <p>
              Original Nepali music written across eight years — from diaspora
              anthems to the stories behind the upcoming debut album{' '}
              <span className="devanagari">{site.album}</span>.
            </p>
          </Reveal>

          <div className="music-grid">
            <Reveal>
              <figure className="video-card">
                <iframe
                  src={`https://www.youtube.com/embed/${site.videos[0].id}`}
                  title={site.videos[0].title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <figcaption>
                  “{site.videos[0].title}” — the latest release, out now.
                </figcaption>
              </figure>
            </Reveal>

            <Reveal className="tracks">
              {site.tracks.map((t) => (
                <div className="track" key={t.id}>
                  <iframe
                    src={`https://open.spotify.com/embed/track/${t.id}?utm_source=generator`}
                    title={t.title}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* works */}
      <section id="works" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">Portfolio</p>
            <h2>Selected works & press</h2>
          </Reveal>
          <div className="works-grid">
            {site.works.map((w) => (
              <Reveal key={w.title} className="work">
                <span className="work-k">{w.k}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
                <a href={w.href} target="_blank" rel="noreferrer">
                  {w.cta} →
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* booking */}
      <section id="booking">
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="sec-kicker">For event organizers</p>
            <h2>Availability & booking</h2>
            <p>
              Pick an open date, send the request, and {site.management} will
              come back within 24 hours with terms and a formal agreement.
            </p>
          </Reveal>
          <Booking />
          <p className="bform-note" style={{ textAlign: 'center', marginTop: '2rem' }}>
            Planning a full event?{' '}
            <a
              href={site.lyanteEventsUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'underline' }}
            >
              {site.management} produces live shows, ticketing and branding →
            </a>
          </p>
        </div>
      </section>

      {/* footer */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              AMIT<span style={{ color: 'var(--crimson)' }}>JUNG</span>
              <small>
                Represented by{' '}
                <a
                  href={site.lyanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--gold, #d4a94e)' }}
                >
                  {site.management}
                </a>{' '}
                · {site.bookingEmail}
              </small>
            </div>
            <div className="foot-social">
              <a href={site.socials.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={site.socials.tiktok} target="_blank" rel="noreferrer">TikTok</a>
              <a href={site.socials.youtube} target="_blank" rel="noreferrer">YouTube</a>
              <a href={site.socials.soundcloud} target="_blank" rel="noreferrer">SoundCloud</a>
              <a href={site.socials.facebook} target="_blank" rel="noreferrer">Facebook</a>
            </div>
          </div>
          <div className="foot-line">
            <span>
              © {new Date().getFullYear()} {site.artist} · {site.management}
            </span>
            <span className="devanagari">{site.album} — {site.albumYear}</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
