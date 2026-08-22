/**
 * One-off migration: push the committed marketing media to Cloudinary.
 *
 * Idempotent. Each file gets a deterministic public id derived from its name
 * and is uploaded with `overwrite: false`, so re-running reports what is
 * already there instead of duplicating or re-billing it.
 *
 * Run with:  pnpm tsx scripts/upload-media.ts
 * Add --force to replace assets that already exist.
 */
import fs from 'node:fs'
import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'

// Same zero-dependency .env loader as prisma.config.ts — kept local so the
// script cannot break on package-manager hoisting.
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    if (process.env[match[1]] !== undefined) continue
    let value = (match[2] ?? '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

const FOLDER = 'lyante/gallery'
const BRAND_FOLDER = 'lyante/brand'

/**
 * Root-level `public/` assets that are safe to serve from a CDN.
 *
 * Deliberately excludes `ticket-background*.{png,jpg}` and `event-poster.jpg`:
 * those are rendered into the ticket that `captureTicketPdf` feeds to
 * html2canvas, which runs with `allowTaint: true` and therefore does NOT set
 * `crossOrigin` on images. A cross-origin ticket background would taint the
 * canvas and make `toDataURL` throw, breaking every ticket PDF download.
 */
const BRAND_FILES = ['logo.png', 'logo-symbol.png']
const FORCE = process.argv.includes('--force')

interface Job {
  file: string
  publicId: string
  resourceType: 'image' | 'video'
}

function collect(): Job[] {
  const jobs: Job[] = []

  const imagesDir = path.join(process.cwd(), 'public', 'images')
  if (fs.existsSync(imagesDir)) {
    for (const name of fs.readdirSync(imagesDir).sort()) {
      if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(name)) continue
      jobs.push({
        file: path.join(imagesDir, name),
        publicId: `${FOLDER}/${path.parse(name).name}`,
        resourceType: 'image',
      })
    }
  }

  const publicDir = path.join(process.cwd(), 'public')
  for (const name of BRAND_FILES) {
    const file = path.join(publicDir, name)
    if (!fs.existsSync(file)) continue
    jobs.push({
      file,
      publicId: `${BRAND_FOLDER}/${path.parse(name).name}`,
      resourceType: 'image',
    })
  }

  const videoDir = path.join(process.cwd(), 'public', 'video')
  if (fs.existsSync(videoDir)) {
    for (const name of fs.readdirSync(videoDir).sort()) {
      if (!/\.(mov|mp4|webm|m4v)$/i.test(name)) continue
      jobs.push({
        file: path.join(videoDir, name),
        publicId: `${FOLDER}/${path.parse(name).name}`,
        resourceType: 'video',
      })
    }
  }

  return jobs
}

async function upload(job: Job) {
  const bytes = fs.statSync(job.file).size
  const result = await cloudinary.uploader.upload(job.file, {
    public_id: job.publicId,
    resource_type: job.resourceType,
    overwrite: FORCE,
    // The public id is fully specified above; without these the SDK appends a
    // random suffix and the ids stop being reproducible.
    use_filename: false,
    unique_filename: false,
    // Large video needs the chunked endpoint.
    ...(job.resourceType === 'video' ? { chunk_size: 6_000_000 } : {}),
  })
  return { job, bytes, width: result.width, height: result.height, url: result.secure_url }
}

async function main() {
  const raw = process.env.CLOUDINARY_URL
  if (!raw) {
    console.error('CLOUDINARY_URL is not set — nothing to do.')
    process.exit(1)
  }
  const parsed = new URL(raw)
  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
    secure: true,
  })

  const jobs = collect()
  console.log(`Uploading ${jobs.length} file(s) to ${parsed.hostname}/${FOLDER}\n`)

  const done: Awaited<ReturnType<typeof upload>>[] = []
  const failed: { job: Job; error: string }[] = []

  // Modest concurrency: enough to be quick, low enough not to trip rate limits
  // or push the 25 MB video through alongside everything else.
  const CONCURRENCY = 4
  let cursor = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++]
        try {
          const result = await upload(job)
          done.push(result)
          console.log(`  ok    ${job.publicId}  (${(result.bytes / 1024 / 1024).toFixed(1)} MB)`)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          failed.push({ job, error: message })
          console.error(`  FAIL  ${job.publicId}  ${message}`)
        }
      }
    }),
  )

  const manifest = Object.fromEntries(
    done
      .sort((a, b) => a.job.publicId.localeCompare(b.job.publicId))
      .map((d) => [
        path.relative(path.join(process.cwd(), 'public'), d.job.file).replace(/\\/g, '/'),
        { publicId: d.job.publicId, resourceType: d.job.resourceType, width: d.width, height: d.height },
      ]),
  )
  fs.writeFileSync('scripts/media-manifest.json', JSON.stringify(manifest, null, 2) + '\n')

  console.log(`\n${done.length} uploaded, ${failed.length} failed.`)
  console.log('Manifest written to scripts/media-manifest.json')
  if (failed.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
