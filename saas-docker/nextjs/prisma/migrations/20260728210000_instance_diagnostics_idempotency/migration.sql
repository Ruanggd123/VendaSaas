-- Canonicalize known aliases before changing conversation identity.
UPDATE "conversations" c
SET "instance_name" = wi."name"
FROM "whatsapp_instances" wi
WHERE c."tenant_id" = wi."tenant_id"
  AND c."instance_name" = wi."connectionName";

UPDATE "conversations" c
SET "instance_name" = COALESCE(
  (
    SELECT MIN(wi."name")
    FROM "whatsapp_instances" wi
    WHERE wi."tenant_id" = c."tenant_id"
    HAVING COUNT(*) = 1
  ),
  'legacy'
)
WHERE c."instance_name" IS NULL OR BTRIM(c."instance_name") = '';

ALTER TABLE "conversations" ALTER COLUMN "instance_name" SET DEFAULT 'legacy';
ALTER TABLE "conversations" ALTER COLUMN "instance_name" SET NOT NULL;
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_tenant_id_contact_number_key";
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_tenant_id_instance_name_contact_number_key"
  ON "conversations"("tenant_id", "instance_name", "contact_number");
CREATE INDEX IF NOT EXISTS "conversations_tenant_id_instance_name_idx"
  ON "conversations"("tenant_id", "instance_name");

CREATE INDEX IF NOT EXISTS "system_configs_updated_at_idx" ON "system_configs"("updated_at");

CREATE TABLE IF NOT EXISTS "diagnostic_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "instance_name" TEXT,
  "provider_event_id" TEXT,
  "category" TEXT NOT NULL,
  "reason_code" TEXT NOT NULL,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostic_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "diagnostic_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "diagnostic_events_tenant_id_created_at_idx" ON "diagnostic_events"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "diagnostic_events_tenant_id_category_reason_code_created_at_idx"
  ON "diagnostic_events"("tenant_id", "category", "reason_code", "created_at");

CREATE TABLE IF NOT EXISTS "payment_operations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "sale_id" TEXT,
  "provider_id" TEXT,
  "result" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_operations_idempotency_key_key" ON "payment_operations"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payment_operations_tenant_id_created_at_idx" ON "payment_operations"("tenant_id", "created_at");

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "service_price" DOUBLE PRECISION;
