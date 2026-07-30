-- Granular client portal permissions + per-record portal visibility

ALTER TABLE "contacts" ADD COLUMN "portal_can_projects" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contacts" ADD COLUMN "portal_can_invoices" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contacts" ADD COLUMN "portal_can_tickets" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "projects" ADD COLUMN "portal_visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "invoices" ADD COLUMN "portal_visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tickets" ADD COLUMN "portal_visible" BOOLEAN NOT NULL DEFAULT true;
