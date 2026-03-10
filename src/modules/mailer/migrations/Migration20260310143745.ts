import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260310143745 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mailer_event_mapping" ("id" text not null, "event_name" text not null, "template_name" text not null, "sender_index" integer not null default 1, "subject" text not null default '', "template_variables" jsonb not null default '{}', "recipient_type" text not null default 'customer_email', "recipient_email" text null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mailer_event_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mailer_event_mapping_deleted_at" ON "mailer_event_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mailer_event_mapping" cascade;`);
  }

}
