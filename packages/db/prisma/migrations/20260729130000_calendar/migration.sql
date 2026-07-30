-- Calendar & meeting scheduling

CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "meeting_url" TEXT,
  "start_at" TIMESTAMPTZ(6) NOT NULL,
  "end_at" TIMESTAMPTZ(6) NOT NULL,
  "all_day" BOOLEAN NOT NULL DEFAULT false,
  "type" TEXT NOT NULL DEFAULT 'event',
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_organization_id_start_at_idx" ON "calendar_events"("organization_id", "start_at");

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "calendar_attendees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_attendees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_attendees_event_id_user_id_key" ON "calendar_attendees"("event_id", "user_id");
CREATE INDEX "calendar_attendees_organization_id_user_id_idx" ON "calendar_attendees"("organization_id", "user_id");

ALTER TABLE "calendar_attendees"
  ADD CONSTRAINT "calendar_attendees_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_attendees"
  ADD CONSTRAINT "calendar_attendees_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_attendees"
  ADD CONSTRAINT "calendar_attendees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
