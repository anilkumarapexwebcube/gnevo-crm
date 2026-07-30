-- AlterTable
ALTER TABLE "seo_projects" ADD COLUMN     "gsc_access_token" TEXT,
ADD COLUMN     "gsc_refresh_token" TEXT,
ADD COLUMN     "gsc_token_expiry" TIMESTAMPTZ(6);
