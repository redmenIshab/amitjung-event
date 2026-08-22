CREATE TABLE "EventAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAssignment_userId_eventId_key" ON "EventAssignment"("userId", "eventId");
CREATE INDEX "EventAssignment_userId_idx" ON "EventAssignment"("userId");
CREATE INDEX "EventAssignment_eventId_idx" ON "EventAssignment"("eventId");

ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
