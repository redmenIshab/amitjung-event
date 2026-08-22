-- Nullable with no backfill: existing sessions predate any reset, and a NULL
-- simply means "never reset", which matches the tokens they already carry.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
