-- Added alone: Postgres forbids using a new enum value in the same
-- transaction that adds it. The table that references it follows separately.
ALTER TYPE "Role" ADD VALUE 'ORGANIZER';
