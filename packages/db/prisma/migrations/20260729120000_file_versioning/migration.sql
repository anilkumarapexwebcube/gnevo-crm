-- File versioning: track version number + link to the original file

ALTER TABLE "file_assets" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "file_assets" ADD COLUMN "version_of" UUID;

CREATE INDEX "file_assets_version_of_idx" ON "file_assets"("version_of");
