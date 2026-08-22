-- New enums, alone in their own migration: Postgres forbids USING a newly
-- created enum value in the same transaction that creates it, and the next
-- migration's table columns use both of these.
CREATE TYPE "TicketAction" AS ENUM ('ISSUED', 'PURCHASED', 'SELF_REGISTERED', 'SCANNED', 'CANCELLED', 'REFUNDED', 'DELETED');
CREATE TYPE "ActorType" AS ENUM ('USER', 'PARTICIPANT', 'SYSTEM');
