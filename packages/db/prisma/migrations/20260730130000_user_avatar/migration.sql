-- User avatar (stored as bytea; small, size-limited at the API)

ALTER TABLE "users" ADD COLUMN "avatar_data" BYTEA;
ALTER TABLE "users" ADD COLUMN "avatar_type" TEXT;
