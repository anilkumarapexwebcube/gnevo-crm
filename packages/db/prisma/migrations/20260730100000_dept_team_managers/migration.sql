-- Managers for departments and teams

ALTER TABLE "departments" ADD COLUMN "manager_id" UUID;
ALTER TABLE "teams" ADD COLUMN "manager_id" UUID;
