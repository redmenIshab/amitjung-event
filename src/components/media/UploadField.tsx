'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

/**
 * Upload control for a single image or video.
 *
 * The file goes browser -> Cloudinary directly; this app only mints the
 * signature. The stored value is a Cloudinary `public_id`, resolved to a URL by
 * `mediaUrl()` at render.
 *
 * Works in both form styles used in the Control Center: it renders a hidden
 * input so `FormData`-based forms (`EventForm`) pick the value up under `name`
 * with no change to their submit handler, and it calls `onChange` so
 * controlled forms (the artist pages) can hold it in state.
 */

export type UploadPurpose = 'event' | 'artist' | 'gallery'

interface SignedUpload {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  resourceTypes: ('image' | 'video')[]
  maxBytes: number
}

interface UploadFieldProps {
  purpose: UploadPurpose
  label: string
  /** Form field name for the hidden input, for FormData-based forms. */
  name?: string
  value?: string | null
  onChange?: (value: string) => void
  /**
   * Id of the record this image belongs to. Passed to the delete endpoint so
   * the column is cleared before the asset is destroyed; omit when creating.
   */
  recordId?: string
  required?: boolean
  hint?: string
}

export function UploadField({
  purpose,
  label,
  name,
  value,
  onChange,
  recordId,
  required,
  hint,
}: UploadFieldProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  // Uncontrolled forms keep the value here; controlled ones mirror `value`.
  const [internal, setInternal] = useState(value ?? '')
  const current = value !== undefined ? (value ?? '') : internal
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  const commit = useCallback(
    (next: string) => {
      setInternal(next)
      onChange?.(next)
    },
    [onChange],
  )

  const isVideo = /\.(mp4|webm|mov)$/i.test(current) || current.includes('/video/')
  const preview = mediaUrl(current, { width: 480, resourceType: isVideo ? 'video' : 'image' })

  async function handleFile(file: File) {
    setError('')

    const signRes = await fetch('/api/media/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose }),
    })
    if (!signRes.ok) {
      const body = await signRes.json().catch(() => ({}))
      setError(body.error ?? 'Could not start the upload.')
      return
    }
    const signed: SignedUpload = await signRes.json()

    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    if (!signed.resourceTypes.includes(kind)) {
      setError(`${kind === 'video' ? 'Video' : 'Images'} not allowed here.`)
      return
    }
    if (file.size > signed.maxBytes) {
      setError(`File is too large (max ${Math.round(signed.maxBytes / 1024 / 1024)} MB).`)
      return
    }

    const form = new FormData()
    form.append('file', file)
    form.append('api_key', signed.apiKey)
    form.append('timestamp', String(signed.timestamp))
    form.append('signature', signed.signature)
    // Must match the signed parameters exactly or Cloudinary rejects the upload.
    form.append('folder', signed.folder)

    setProgress(0)
    try {
      const publicId = await new Promise<string>((resolve, reject) => {
        // XHR rather than fetch: fetch exposes no upload progress event, and a
        // 200 MB gallery video with no feedback looks like a hung page.
        const xhr = new XMLHttpRequest()
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/${kind}/upload`,
        )
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`Upload failed (${xhr.status})`))
            return
          }
          try {
            resolve(JSON.parse(xhr.responseText).public_id as string)
          } catch {
            reject(new Error('Upload succeeded but the response was unreadable.'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed — check your connection.'))
        xhr.send(form)
      })
      commit(publicId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setProgress(null)
    }
  }

  async function handleRemove() {
    const previous = current
    setError('')
    commit('')
    if (fileRef.current) fileRef.current.value = ''

    // Legacy pasted URLs are not ours to destroy — just drop the reference.
    if (!previous || /^https?:\/\//i.test(previous) || previous.startsWith('/')) return

    const res = await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose, publicId: previous, recordId }),
    })
    if (!res.ok) setError('The image was removed here, but deleting it from storage failed.')
  }

  const busy = progress !== null

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>

      {name && <input type="hidden" name={name} value={current} />}

      {preview && (
        <div className="relative w-full max-w-xs overflow-hidden rounded-lg border border-border">
          {isVideo ? (
            <video src={preview} className="h-40 w-full object-cover" muted playsInline />
          ) : (
            // Not next/image: the preview is transient and already sized by
            // the transformation, so the optimiser adds a round trip for nothing.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-40 w-full object-cover" />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          className="sr-only"
          accept={purpose === 'gallery' ? 'image/*,video/*' : 'image/*'}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {busy ? `Uploading ${progress}%` : current ? 'Replace' : 'Upload'}
        </Button>

        {current && !busy && (
          <Button type="button" variant="destructive" size="sm" onClick={() => void handleRemove()}>
            <X />
            Remove
          </Button>
        )}
      </div>

      {busy && (
        <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}

      {error && (
        <p className={cn('flex items-center gap-1.5 text-xs text-destructive')}>
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {required && !current && (
        <p className="text-xs text-muted-foreground">An image is required.</p>
      )}
    </div>
  )
}
