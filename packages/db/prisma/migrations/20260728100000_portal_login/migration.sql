-- AlterTable: client-portal login fields on contacts
ALTER TABLE "contacts" ADD COLUMN     "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portal_password_hash" TEXT,
ADD COLUMN     "portal_last_login_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
