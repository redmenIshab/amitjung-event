-- Indexes for the foreign keys and filtered columns on the original schema.
--
-- Postgres creates indexes for PRIMARY KEY and UNIQUE constraints but NOT for
-- foreign keys, and Prisma does not add them either — so until now every join
-- and aggregate below ran as a sequential scan. The public /events listing
-- aggregates the whole Ticket table on every request, which is what made the
-- slowness grow with ticket volume rather than appear all at once.
--
-- Plain CREATE INDEX (not CONCURRENTLY): Prisma wraps each migration in a
-- transaction, and CONCURRENTLY cannot run inside one. These take a brief write
-- lock per table, which is acceptable at this data size.

-- Event: ordered by date on every listing, filtered by status for the public list.
CREATE INDEX "Event_bookingDeadline_idx" ON "Event"("bookingDeadline");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_artistId_idx" ON "Event"("artistId");

-- Ticket: the composite serves both the sold-count aggregate
-- (groupBy eventId WHERE status <> 'CANCELLED') and plain eventId lookups via
-- its leftmost column.
CREATE INDEX "Ticket_eventId_status_idx" ON "Ticket"("eventId", "status");
CREATE INDEX "Ticket_bookingId_idx" ON "Ticket"("bookingId");
CREATE INDEX "Ticket_attendeeEmail_idx" ON "Ticket"("attendeeEmail");

-- Payment: analytics groups by event and status; the sales trend scans PAID
-- payments in date order.
CREATE INDEX "Payment_eventId_paymentStatus_idx" ON "Payment"("eventId", "paymentStatus");
CREATE INDEX "Payment_paymentStatus_createdAt_idx" ON "Payment"("paymentStatus", "createdAt");
CREATE INDEX "Payment_paymentInitiatorId_idx" ON "Payment"("paymentInitiatorId");

-- Booking: every column here is a foreign key joined on constantly.
CREATE INDEX "Booking_paymentId_idx" ON "Booking"("paymentId");
CREATE INDEX "Booking_eventId_idx" ON "Booking"("eventId");
CREATE INDEX "Booking_participantId_idx" ON "Booking"("participantId");

-- Music: foreign key to Artist.
CREATE INDEX "Music_artistId_idx" ON "Music"("artistId");

-- CheckIn: check-in timelines read scans in chronological order.
CREATE INDEX "CheckIn_scannedAt_idx" ON "CheckIn"("scannedAt");
