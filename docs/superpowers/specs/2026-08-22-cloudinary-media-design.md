# Cloudinary media & blob storage — design

**Date:** 2026-08-22
**Status:** approved, implementing

## Problem

The app has no upload path. Event posters and artist photos are pasted
URLs typed into a text box (`EventForm.tsx`, `artists/new/page.tsx`), so
media lives on whatever third-party host the staffer happened to use and
breaks when that host does. The marketing gallery is 99 MB of JPEGs and a
QuickTime `.mov` committed to `public/`, shipped in every deploy and
served unoptimised at full resolution.

`CLOUDINARY_URL` is present in `.env` (cloud `r7waqwpz`) and referenced
nowhere.

## Decisions

| Question | Decision |
|---|---|
| Scope | Event posters, artist photos, marketing gallery, and a reusable upload service |
| Transport | Signed direct-to-browser upload; bytes never cross the serverless function |
| Persisted value | Cloudinary `public_id`, resolved to a URL at render |
| Gallery | One-off upload script + swap the constants; no CMS |
| Lifecycle | No delete on replace; an explicit "remove" action destroys the asset |
| Library | `cloudinary` server SDK for signing and destroy; hand-rolled browser uploader |

### Why signed direct upload

Vercel caps a route handler request body at 4.5 MB, which `showreel.mov`
(25 MB) exceeds outright. Proxying also spends serverless execution time
streaming bytes. The signature is minted by a gated route, so the API
secret stays server-side while the transfer goes browser→Cloudinary.

### Why `public_id` rather than `secure_url`

Storing the id keeps the transformation open: the same asset serves
`f_auto,q_auto` at whatever width the call site needs, and deletion needs
no URL parsing. Legacy pasted URLs keep working because the resolver
passes anything starting with `http` or `/` through untouched — so this
needs no data migration.

## Architecture

Two modules, split for the same reason `eventScope.ts` is split from
`eventAccess.ts` (ARCHITECTURE §15.13): the resolver runs in client
components, and the SDK holds the API secret.

| Module | Imports | Runs |
|---|---|---|
| `src/lib/media.ts` | nothing | client + server |
| `src/lib/cloudinary.ts` | `cloudinary` SDK | server only |

`media.ts` exports `mediaUrl(value, opts)` and `mediaRefSchema`. It reads
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — a separate public var, because
`CLOUDINARY_URL` embeds the API secret and can never reach the browser.

`cloudinary.ts` exports `isCloudinaryConfigured`, `signUpload(purpose)`
and `destroyAsset(publicId)`, and is added to `serverExternalPackages`.

### Resolution

```
mediaUrl(v, { width, height, crop })
  !v                       -> null
  /^https?:\/\//  or  /^\//-> v unchanged        (legacy URLs, /public paths)
  otherwise                -> https://res.cloudinary.com/<cloud>/<type>/upload
                                /f_auto,q_auto[,w_N,c_fill]/<public_id>
```

**The database and the API carry the raw stored value. `mediaUrl()` is
applied at render, never at write and never in a route handler.** One
place to change, and existing API contracts are untouched.

### Upload authorisation

The client sends a `purpose`, never a folder. The server maps it:

| purpose | capability | folder | resource types |
|---|---|---|---|
| `event` | `EVENT_WRITE` | `lyante/events` | image |
| `artist` | `ARTIST_MANAGE` | `lyante/artists` | image |
| `gallery` | `MARKETING_MANAGE` | `lyante/gallery` | image, video |

The signature therefore constrains destination and resource type: a
MANAGER holding `MARKETING_MANAGE` cannot mint a signature that writes
over an event poster. Capability-driven per ARCHITECTURE §6 — no role
strings in the feature.

**Known limitation.** A Cloudinary signature can pin folder, timestamp
and public_id but *not* a byte cap. The size check is client-side and a
caller holding a valid signature can bypass it. The real backstop is the
account-level max-file-size in the Cloudinary console, which is
configuration outside this repo.

Signature minting is rate-limited through `src/lib/rateLimit.ts`;
unbounded minting is unbounded upload billed to the account.

### Removal ordering

`DELETE /api/media` takes `{ purpose, publicId, recordId? }`:

- `recordId` present (editing a saved record) — clear the column, *then*
  destroy at Cloudinary.
- `recordId` absent (creating) — destroy only; nothing references it.

Clearing first means there is never a saved row pointing at a destroyed
asset, which is the failure the naive ordering produces when a staffer
removes an image and then navigates away without saving.

### Degradation

Unconfigured Cloudinary must not break the app (ARCHITECTURE §15.7):
`/api/media/sign` returns 503, `mediaUrl` returns its input unchanged,
every already-stored URL still renders.

## Validation changes

Two schemas demand a URL and would reject every `public_id`:

- `src/lib/validations.ts` — `image: z.string().url()...`
- `src/types/artist.ts` — `artistImage: z.string().url(...)`

Both move to the shared `mediaRefSchema`, which accepts a URL *or* a
public_id. Missing either means uploads succeed at Cloudinary and then
422 on save.

## Gallery migration

`scripts/upload-media.ts` uploads `public/images/*` and
`public/video/showreel.mov` under deterministic public_ids with
`overwrite: false`, so re-running is idempotent, then prints the mapping.
The 63 references across 5 files (`home/page.tsx`, `works.ts`,
`Hero.tsx`, `Portfolio.tsx`, `GalleryHeader.tsx`) are swapped to
public_ids read through `mediaUrl()`. The pixel dimensions in `works.ts`
stay — they reserve each tile's aspect ratio and dropping them
reintroduces layout shift.

`next.config.ts` gains `images.remotePatterns` for `res.cloudinary.com`.
This is mandatory, not cosmetic: `WorkTile`, `Lightbox`, `Hero` and
`Portfolio` render `next/image` *without* `unoptimized`, and the
optimiser rejects un-allowlisted remote hosts.

Being accurate about the payoff: deleting the files does **not** shrink
`.git`, since the blobs remain in history. What improves is the deploy
bundle, build time, and delivery. The correctness win is `showreel.mov` —
`f_auto` serves mp4/webm instead of a QuickTime container that Firefox
largely refuses to play.

## Testing

- `tests/lib/media.test.ts` — passthrough for `http(s)` and leading `/`,
  public_id to `f_auto,q_auto`, width option, unconfigured cloud falls
  back to raw; `mediaRefSchema` accepts both shapes, rejects junk.
- `tests/api/mediaSign.test.ts` — 401 anonymous; **403 for MANAGER on
  `purpose=event`**, the assertion that proves the purpose→capability
  map; 200 ADMIN; 403 ORGANIZER throughout; 503 unconfigured; 422 on an
  unknown purpose.
- `tests/lib/cloudinary.test.ts` — signature determinism against a fixed
  fixture; the purpose map is exhaustive over `MediaPurpose`.

No jsdom test for `UploadField`: mocking XHR upload progress buys little
against the lib and API coverage.

## Landmines this adds

1. `src/lib/media.ts` must never import the `cloudinary` SDK — it is
   bundled into client components, and the SDK carries the API secret.
2. `mediaUrl()` is applied at render only. Resolving in a route handler
   bakes a transformation into stored data and breaks the passthrough.
3. The `purpose` map is the authorisation boundary. Accepting a
   client-supplied folder would let any upload-capable role write
   anywhere.
