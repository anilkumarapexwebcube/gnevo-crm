-- Task planning: start date + dependencies (Gantt / critical-path support)

ALTER TABLE "tasks" ADD COLUMN "start_date" DATE;
ALTER TABLE "tasks" ADD COLUMN "blocked_by" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
