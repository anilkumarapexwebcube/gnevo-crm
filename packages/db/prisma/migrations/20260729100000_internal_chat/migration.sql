-- Internal chat: channels, members, messages

CREATE TABLE "chat_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_private" BOOLEAN NOT NULL DEFAULT false,
  "is_dm" BOOLEAN NOT NULL DEFAULT false,
  "dm_key" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "chat_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_channels_organization_id_dm_key_key" ON "chat_channels"("organization_id", "dm_key");
CREATE INDEX "chat_channels_organization_id_idx" ON "chat_channels"("organization_id");

ALTER TABLE "chat_channels"
  ADD CONSTRAINT "chat_channels_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chat_channel_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "channel_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "last_read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "chat_channel_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_channel_members_channel_id_user_id_key" ON "chat_channel_members"("channel_id", "user_id");
CREATE INDEX "chat_channel_members_organization_id_user_id_idx" ON "chat_channel_members"("organization_id", "user_id");

ALTER TABLE "chat_channel_members"
  ADD CONSTRAINT "chat_channel_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_channel_members"
  ADD CONSTRAINT "chat_channel_members_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_channel_members"
  ADD CONSTRAINT "chat_channel_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "channel_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "author_name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_messages_channel_id_created_at_idx" ON "chat_messages"("channel_id", "created_at");

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
