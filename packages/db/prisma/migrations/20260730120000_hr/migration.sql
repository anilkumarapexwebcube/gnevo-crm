-- HR: attendance, leave requests, holidays

CREATE TABLE "attendance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "check_in" TIMESTAMPTZ(6),
  "check_out" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'present',
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attendance_user_id_date_key" ON "attendance"("user_id", "date");
CREATE INDEX "attendance_organization_id_date_idx" ON "attendance"("organization_id", "date");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "leave_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "user_name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'casual',
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by_id" UUID,
  "reviewed_by_name" TEXT,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_organization_id_status_idx" ON "leave_requests"("organization_id", "status");
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "holidays" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "holidays_organization_id_date_idx" ON "holidays"("organization_id", "date");
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
