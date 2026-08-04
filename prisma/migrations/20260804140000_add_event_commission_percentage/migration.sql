-- AlterTable: Lyante's agreed commission on this event's net ticket sales,
-- as a whole percent. Per-organizer, so it belongs on the event.
--
-- Deliberately NULLable with no backfill: events created before this field
-- have no agreed rate on record, and inventing one (0 or otherwise) would put
-- a fabricated number into financial reporting. Analytics renders NULL as
-- "not set". New and edited events are required to supply a rate at the
-- application layer (createEventSchema / updateEventSchema).
ALTER TABLE "Event" ADD COLUMN "commissionPercentage" INTEGER;
