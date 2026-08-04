-- AlterEnum
-- Non-staff role for publicly self-registered accounts. Holds no capability,
-- so it cannot reach the Control Center.
--
-- This is deliberately alone in its own migration: Postgres forbids USING a
-- newly added enum value in the same transaction that adds it, and the next
-- migration sets it as the User.role default.
ALTER TYPE "Role" ADD VALUE 'USER';
