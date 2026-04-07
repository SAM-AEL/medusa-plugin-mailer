import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260408090500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mailer_event_mapping_event_name" ON "mailer_event_mapping" ("event_name") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mailer_event_mapping_recipient_email" ON "mailer_event_mapping" ("recipient_email") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mailer_event_mapping_created_at" ON "mailer_event_mapping" ("created_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_mailer_event_mapping_event_name";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_mailer_event_mapping_recipient_email";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_mailer_event_mapping_created_at";`)
  }
}
