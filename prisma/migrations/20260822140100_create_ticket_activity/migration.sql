CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" "TicketAction" NOT NULL,
    "ticketId" TEXT,
    "paymentId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "actorRole" TEXT,
    "reason" TEXT,
    "amount" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketActivity_eventId_createdAt_idx" ON "TicketActivity"("eventId", "createdAt");
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");

-- Only the event is a foreign key. ticketId / paymentId / actorId are plain
-- columns so the log survives deletion or renaming of what it describes.
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
