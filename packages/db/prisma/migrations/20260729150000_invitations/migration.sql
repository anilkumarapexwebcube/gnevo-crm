-- Workspace invitations

CREATE TABLE "invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "email" CITEXT NOT NULL,
  "role_key" TEXT NOT NULL DEFAULT 'member',
  "department_id" UUID,
  "team_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invited_by_id" UUID,
  "invited_by_name" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invitations_organization_id_status_idx" ON "invitations"("organization_id", "status");

ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
