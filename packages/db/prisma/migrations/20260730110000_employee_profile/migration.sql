-- Employee profile fields

ALTER TABLE "users" ADD COLUMN "designation" TEXT;
ALTER TABLE "users" ADD COLUMN "employee_id" TEXT;
ALTER TABLE "users" ADD COLUMN "joining_date" DATE;
ALTER TABLE "users" ADD COLUMN "reporting_manager_id" UUID;
