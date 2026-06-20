# Lyante Ticketing Teaser Video — Design Spec

## Purpose

A ~25-second vertical social media teaser (Reels/TikTok/Stories) promoting the Lyante Production event ticketing product. Silent — narrative carried entirely by animated captions. Built with Remotion as a standalone project, separate from the `event-tickets` Next.js app.

## Audience & placement

Social media teaser for Instagram Reels / TikTok / Stories. Not a sales demo, not a marketing-site hero — fast, punchy, scroll-stopping.

## Visual approach: hybrid

- **Real screen recordings** (provided by the user, not captured by Claude) for: creating an event, registering as an attendee, and scanning a ticket at the door.
- **Fully animated Remotion/SVG recreation** for the ticket + QR code generation moment — this is the "hero" visual beat and benefits from frame-precise animated control that a screen recording can't give.

## Project location & stack

New standalone project: `/Users/redmen/Projects/lyante-ticketing-teaser`

- `remotion` + `@remotion/cli`, TypeScript
- `@remotion/google-fonts` — loads Cormorant Garamond, Bebas Neue, DM Mono reliably during rendering (avoids raw `@font-face` issues in headless render)
- `@remotion/transitions` — `<TransitionSeries>` for fade/slide cuts between scenes (official package for this, avoids hand-rolled opacity math)
- Composition: **1080×1920 (9:16), 30fps, 750 frames (~25s)**
- Brand tokens ported from `event-tickets/src/app/globals.css` `@theme` block into `src/theme.ts`:
  - `gold-light #F5C842`, `gold #C8922A`, `gold-deep #8B5E10`
  - `lyante-bg #080808`, `lyante-surface #111111`, `lyante-surface-mid #1C1C1C`
  - `ivory #F0EDE6`, `ash #9A9590`, `coal #4A4744`
  - Fonts: Cormorant Garamond (serif/display), Bebas Neue (bold display/captions), DM Sans (body), DM Mono (labels)

## Scene breakdown

All scenes composed via `<TransitionSeries>` with ~0.3s fade/slide cuts between each.

| # | Scene | Duration | Type | Content |
|---|-------|----------|------|---------|
| 1 | Hook | 0–2.5s (75f) | Animated | Lyante wordmark animates in over `lyante-bg`, gold accent line draws in, tagline "Tickets, Reimagined" |
| 2 | Create Event | 2.5–7s (135f) | Real footage | `create-event.mp4` in device frame; caption "Set up your event in minutes" |
| 3 | Register | 7–11s (120f) | Real footage | `register.mp4` in device frame; caption "Attendees register in seconds" |
| 4 | Ticket + QR | 11–16s (150f) | Animated | Ticket card flies in (spring), QR code draws stroke-by-stroke; caption "Every ticket, uniquely verified" |
| 5 | Scanner check-in | 16–21s (150f) | Real footage + animated overlay | `scanner.mp4` in device frame, animated green checkmark/flash on success; caption "Instant check-in at the door" |
| 6 | Outro | 21–25s (120f) | Animated | Logo + "We Bring Events to Life" + CTA, gold line collapses |

Total: 750 frames @ 30fps = 25s (scene durations include transition overlap handled by `TransitionSeries`).

## Footage convention

```
public/footage/
  create-event.mp4
  register.mp4
  scanner.mp4
```

- Each real-footage scene component checks for its file's existence at render/preview time. If missing, it renders a labeled placeholder (gold text on black: `FOOTAGE MISSING: create-event.mp4 — record 6–10s, any aspect ratio`) so the full video previews and renders correctly before clips are supplied.
- Clips are rendered via `<OffthreadVideo>` (Remotion's frame-accurate video component — required for reliable headless rendering, unlike the regular `<Video>` tag which can drop frames during render).
- Any source aspect ratio is acceptable; the device-frame wrapper crops/centers via `object-fit: cover`.
- Recommended source clip length: 6–10s each (trimmed/time-remapped to fit each scene's allotted duration in Remotion via `<Sequence>` offsets, not by asking the user to pre-trim).

## Visual treatment for real footage

- Wrapped in a minimal rounded-rect device frame: subtle gold (`--color-gold`) border, soft drop shadow, rounded corners (~24px at this resolution).
- A subtle gold-tinted gradient vignette overlay sits on top of the video layer (low-opacity radial gradient from `gold-deep` to transparent) to tie the footage back into the dark cinematic Lyante palette.
- Captions render below the device frame in Bebas Neue, animated with a spring-based slide-up + fade-in (via Remotion's `spring()` + `interpolate()` — not CSS transitions, which aren't frame-deterministic and break headless rendering).

## Animated Ticket + QR scene (scene 4 detail)

- Ticket card: SVG/React recreation matching the app's actual ticket visual style (gold border, ivory background, event name/venue/date placeholder text), enters via spring-based scale+fade.
- QR code: generated at build time using the `qrcode` library (already a dependency in the main `event-tickets` app — same approach, new project gets its own copy) with a sample/placeholder token, then the QR's SVG path is animated to draw in stroke-by-stroke using `strokeDasharray`/`strokeDashoffset` interpolated by frame — not a static image swap.

## Audio

None. Silent video; narrative carried entirely by on-screen captions. No music track, no SFX — out of scope for this version (could be added later by dropping a track into a future audio sequence).

## Rendering

- Preview/iterate via `npx remotion studio`
- Final render via `npx remotion render TeaserComposition out/teaser.mp4 --codec=h264`
- Output: single MP4, 1080×1920, ready for direct upload to Reels/TikTok/Stories.

## Out of scope

- Capturing the real screen recordings (user-provided).
- Music/voiceover/SFX.
- Multiple aspect-ratio exports (square/horizontal) — vertical only for this version.
- Automated end-to-end testing — Remotion projects are verified by visual preview (`remotion studio`) and a render smoke-test, not unit tests.
