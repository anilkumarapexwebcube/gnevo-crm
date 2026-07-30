-- CreateTable
CREATE TABLE "seo_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "customer_id" UUID,
    "name" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "gsc_connected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "seo_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "seo_project_id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "position" INTEGER,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seo_projects_organization_id_idx" ON "seo_projects"("organization_id");

-- CreateIndex
CREATE INDEX "keywords_organization_id_seo_project_id_idx" ON "keywords"("organization_id", "seo_project_id");

-- AddForeignKey
ALTER TABLE "seo_projects" ADD CONSTRAINT "seo_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_seo_project_id_fkey" FOREIGN KEY ("seo_project_id") REFERENCES "seo_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
