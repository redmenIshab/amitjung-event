# Lyante Brand Reel Teaser Video — Design Spec

## Purpose

A ~27-second vertical social media teaser (Reels/TikTok/Stories) for Lyante Production as a creative event-production company, with one beat dedicated to their ticketing product. Silent — narrative carried entirely by animated captions. Built with Remotion as a standalone project, separate from the `event-tickets` Next.js app.

**Revision note:** this spec originally scoped a ticketing-product-only demo (create event → register → ticket/QR → scanner). The user provided real footage that turned out to be a full scroll-through of the Lyante marketing site (hero, services, process, ticketing pitch, portfolio, testimonials, footer) rather than the ticketing app's screens. The scope pivoted to a company brand reel that folds in a ticketing beat, using this real footage as the backbone.

## Audience & placement

Social media teaser for Instagram Reels / TikTok / Stories. Not a sales demo, not a marketing-site hero — fast, punchy, scroll-stopping.

## Visual approach: hybrid

- **Real footage** — a single provided screen recording (`Screen Recording 2026-06-20 at 11.34.51.mov`, 674×1446, h264/yuv420p, 50.25s, mobile scroll-through of the Lyante marketing site) supplies 5 of the 6 scenes via timestamp-based trims.
- **Fully animated Remotion/SVG recreation** for one scene: a polished ticket + QR code "payoff" shot, built from scratch, immediately following the real-footage scene that shows the site's own ticketing pitch. The real footage teases the feature in context; the animated scene is the crisp close-up payoff.

## Project location & stack

New standalone project: `/Users/redmen/Projects/lyante-ticketing-teaser`

- `remotion` + `@remotion/cli`, TypeScript
- `@remotion/google-fonts` — loads Cormorant Garamond, Bebas Neue, DM Mono reliably during rendering (avoids raw `@font-face` issues in headless render)
- `@remotion/transitions` — `<TransitionSeries>` for fade/slide cuts between scenes (official package for this, avoids hand-rolled opacity math)
- Composition: **1080×1920 (9:16), 30fps, 810 frames (~27s)**
- Brand tokens ported from `event-tickets/src/app/globals.css` `@theme` block into `src/theme.ts`:
  - `gold-light #F5C842`, `gold #C8922A`, `gold-deep #8B5E10`
  - `lyante-bg #080808`, `lyante-surface #111111`, `lyante-surface-mid #1C1C1C`
  - `ivory #F0EDE6`, `ash #9A9590`, `coal #4A4744`
  - Fonts: Cormorant Garamond (serif/display), Bebas Neue (bold display/captions), DM Sans (body), DM Mono (labels)

## Source footage

```
public/footage/lyante-walkthrough.mov
```

Single file, copied in from `~/Desktop/Screen Recording 2026-06-20 at 11.34.51.mov`. Confirmed h264/yuv420p — directly compatible with Remotion's `<OffthreadVideo>`, no transcoding required.

Timeline of the source recording (used to derive trim points below):

| Source time | Content |
|---|---|
| 0–8s | Hero: "We Document The Journey" / "We don't just cover events. We preserve them." |
| 10–20s | Services cards (Pre-Production → ... → Branding) |
| 20–25s | "Our Process" timeline (Pre-Event, Event Day, Post-Event, Forever) |
| 25–30s | "Smart Ticketing" — "Zero hassle. Zero fakes." + checklist + animated QR graphic |
| 30–40s | Portfolio grid (event/work photos) |
| 40–45s | Testimonials ("What Clients Say") |
| 45–50s | Footer: "Let's create" / "Send Your Brief" CTA + Lyante info/socials |

## Scene breakdown

All scenes composed via `<TransitionSeries>` with ~0.3s fade/slide cuts between each. Real-footage scenes use `<OffthreadVideo>` with `startFrom`/`endAt` (in source-video frames, source is 120fps per `ffprobe`) to select the trim window, wrapped in the device frame.

| # | Scene | Frames (30fps) | Type | Source trim | Content / caption |
|---|-------|------|------|------|---------|
| 1 | Hook | 90 (3s) | Real footage | 0–8s window, cut to most legible 3s | "We Document The Journey" |
| 2 | Process montage | 150 (5s) | Real footage, sped up | 10–25s window | Services cards → Process timeline; caption "From first frame to final cut" |
| 3 | Ticketing (site) | 120 (4s) | Real footage | 25–30s window | "Zero hassle. Zero fakes."; caption "Smart ticketing, built in" |
| 4 | Ticket + QR (built) | 150 (5s) | **Animated recreation** | — | Ticket card flies in (spring), QR draws stroke-by-stroke; caption "Every ticket, uniquely verified" |
| 5 | Portfolio proof | 150 (5s) | Real footage | 30–40s window | Quick cuts of work samples; caption "This is what we make" |
| 6 | Outro CTA | 150 (5s) | Real footage | 45–50s window | "Send Your Brief" footer + logo; caption "Lyante Production — Send Your Brief" |

Total: 810 frames @ 30fps = 27s (scene durations include transition overlap handled by `TransitionSeries`).

## Visual treatment for real footage

- Wrapped in a minimal rounded-rect device frame: subtle gold (`--color-gold`) border, soft drop shadow, rounded corners (~24px at this resolution).
- A subtle gold-tinted gradient vignette overlay sits on top of the video layer (low-opacity radial gradient from `gold-deep` to transparent) to tie the footage back into the dark cinematic Lyante palette.
- Scene 2 (process montage) compresses a 15s source window into 5s of screen time (3× speed via Remotion frame-rate remapping); Scene 5 (portfolio) compresses a 10s source window into 5s (2× speed). Both are already scroll-throughs, so a faster scroll reads as intentional pacing rather than a glitch.
- Captions render below the device frame in Bebas Neue, animated with a spring-based slide-up + fade-in (via Remotion's `spring()` + `interpolate()` — not CSS transitions, which aren't frame-deterministic and break headless rendering).

## Animated Ticket + QR scene (scene 4 detail)

- Ticket card: SVG/React recreation matching the app's actual ticket visual style (gold border, ivory background, event name/venue/date placeholder text), enters via spring-based scale+fade.
- QR code: generated at build time using the `qrcode` library (already a dependency in the main `event-tickets` app — same approach, new project gets its own copy) with a sample/placeholder token, then the QR's SVG path is animated to draw in stroke-by-stroke using `strokeDasharray`/`strokeDashoffset` interpolated by frame — not a static image swap.
- This scene has no real-footage fallback concern (it's never "missing") since it's fully generated.

## Audio

None. Silent video; narrative carried entirely by on-screen captions. No music track, no SFX — out of scope for this version (could be added later by dropping a track into a future audio sequence).

## Rendering

- Preview/iterate via `npx remotion studio`
- Final render via `npx remotion render BrandReelTeaser out/teaser.mp4 --codec=h264`
- Output: single MP4, 1080×1920, ready for direct upload to Reels/TikTok/Stories.

## Out of scope

- Capturing additional screen recordings — this version uses only the one provided source file.
- Music/voiceover/SFX.
- Multiple aspect-ratio exports (square/horizontal) — vertical only for this version.
- Automated end-to-end testing — Remotion projects are verified by visual preview (`remotion studio`) and a render smoke-test, not unit tests.
- The original ticketing-product-only demo (create event / register / scanner screens) — descoped when the provided footage turned out to be the marketing site, not the app. Could be a future follow-up video once those screens are recorded.
