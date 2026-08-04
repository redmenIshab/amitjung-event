-- AlterTable: soft-delete marker for staff accounts.
-- Set = deactivated (blocked at login, downgraded on token refresh).
-- Nullable, so existing rows stay active with no backfill needed.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: public self-registration must not mint CRM access.
-- New rows default to the capability-less USER role; staff roles are only
-- ever assigned explicitly by an admin.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
