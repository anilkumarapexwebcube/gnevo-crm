-- AI RAG embeddings, client health snapshots, task/meeting summaries

ALTER TABLE "projects" ADD COLUMN "ai_summary" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "summary" TEXT;

CREATE TABLE "embeddings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  "vector" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
  "model" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "embeddings_organization_id_entity_type_entity_id_key" ON "embeddings"("organization_id", "entity_type", "entity_id");
CREATE INDEX "embeddings_organization_id_idx" ON "embeddings"("organization_id");

ALTER TABLE "embeddings"
  ADD CONSTRAINT "embeddings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "client_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "open_deals" INTEGER NOT NULL DEFAULT 0,
  "open_deals_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "won_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paid_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "open_tickets" INTEGER NOT NULL DEFAULT 0,
  "open_projects" INTEGER NOT NULL DEFAULT 0,
  "health_score" INTEGER NOT NULL DEFAULT 0,
  "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "client_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_snapshots_organization_id_customer_id_captured_at_idx" ON "client_snapshots"("organization_id", "customer_id", "captured_at");

ALTER TABLE "client_snapshots"
  ADD CONSTRAINT "client_snapshots_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_snapshots"
  ADD CONSTRAINT "client_snapshots_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
