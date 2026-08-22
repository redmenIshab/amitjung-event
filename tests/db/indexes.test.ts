import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Index coverage and schema/migration drift.
 *
 * Postgres indexes PRIMARY KEY and UNIQUE constraints but NOT foreign keys, and
 * Prisma adds none of its own. Until these were added, the public /events
 * listing aggregated the entire Ticket table on every request as a sequential
 * scan — the slowness grew with ticket volume rather than appearing all at once.
 *
 * These tests run offline against the schema and migration files, so they guard
 * the indexes without needing a database:
 *  1. every `@@index` in the schema has a matching CREATE INDEX in a migration
 *  2. the columns behind the hottest queries stay indexed
 */

const ROOT = join(__dirname, '..', '..')
const schema = readFileSync(join(ROOT, 'prisma', 'schema.prisma'), 'utf8')

/** Every `@@index([...])` in the schema, as `Model([cols])`. */
function schemaIndexes(): { model: string; columns: string[] }[] {
  const out: { model: string; columns: string[] }[] = []
  const modelBlocks = schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)
  for (const [, model, body] of modelBlocks) {
    for (const [, cols] of body.matchAll(/@@index\(\[([^\]]+)\]\)/g)) {
      out.push({ model, columns: cols.split(',').map((c) => c.trim()) })
    }
  }
  return out
}

/** Every CREATE INDEX across the whole migration history, normalised. */
function migrationIndexes(): Set<string> {
  const dir = join(ROOT, 'prisma', 'migrations')
  const sql = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => readFileSync(join(dir, e.name, 'migration.sql'), 'utf8'))
    .join('\n')

  const found = new Set<string>()
  for (const [, table, cols] of sql.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+"[^"]+"\s+ON\s+"(\w+)"\s*\(([^)]+)\)/gi,
  )) {
    const columns = cols
      .split(',')
      .map((c) => c.trim().replace(/"/g, '').replace(/\s+(ASC|DESC)$/i, ''))
    found.add(`${table}(${columns.join(',')})`)
  }
  return found
}

describe('schema and migrations agree on indexes', () => {
  it('every @@index in the schema exists in a migration', () => {
    const declared = schemaIndexes()
    const applied = migrationIndexes()

    // Guards against the schema drifting ahead of the SQL — the index would
    // exist in the model but never be created in any database.
    const missing = declared
      .map((d) => `${d.model}(${d.columns.join(',')})`)
      .filter((key) => !applied.has(key))

    expect(missing).toEqual([])
  })

  it('finds a non-trivial number of indexes, so the parsers actually matched', () => {
    // A regex that silently matches nothing would make the test above vacuous.
    expect(schemaIndexes().length).toBeGreaterThan(10)
    expect(migrationIndexes().size).toBeGreaterThan(10)
  })
})

describe('the hot query paths stay indexed', () => {
  const applied = migrationIndexes()

  const required: [string, string, string][] = [
    // [index key, what it serves, why it hurts without one]
    [
      'Ticket(eventId,status)',
      'sold-count aggregate on every public /events view',
      'sequential scan of the whole Ticket table per page view',
    ],
    ['Ticket(bookingId)', 'ticket → booking joins, refund cascade', 'scan per join'],
    ['Ticket(attendeeEmail)', '"My Tickets" email match', 'scan per buyer request'],
    ['Booking(paymentId)', 'refund cascade, payment → tickets', 'scan per refund'],
    ['Booking(eventId)', 'per-event booking lookups', 'scan per lookup'],
    ['Booking(participantId)', '"My Tickets" booking match', 'scan per buyer request'],
    ['Payment(eventId,paymentStatus)', 'every analytics money aggregate', 'scan per report'],
    ['Payment(paymentStatus,createdAt)', 'sales trend over time', 'scan + sort per report'],
    ['Event(bookingDeadline)', 'listing order and the upcoming filter', 'full sort per listing'],
    ['Event(status)', 'public listing filter', 'scan per listing'],
    ['Music(artistId)', 'artist → music', 'scan per artist page'],
  ]

  it.each(required)('%s — serves %s', (key) => {
    expect(applied.has(key)).toBe(true)
  })
})
