import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "inquiry_records_notification_events" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "occurred_at" timestamp(3) with time zone NOT NULL,
    "status" varchar NOT NULL,
    "code" varchar
  );

  ALTER TABLE "inquiry_records_internal_notes" ALTER COLUMN "author_id" DROP NOT NULL;
  ALTER TABLE "inquiry_records_internal_notes" ADD COLUMN "author_label" varchar NOT NULL;
  ALTER TABLE "inquiry_records_notification_events" ADD CONSTRAINT "inquiry_records_notification_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."inquiry_records"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "inquiry_records_notification_events_order_idx" ON "inquiry_records_notification_events" USING btree ("_order");
  CREATE INDEX "inquiry_records_notification_events_parent_id_idx" ON "inquiry_records_notification_events" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiry_records_notification_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "inquiry_records_notification_events" CASCADE;
  ALTER TABLE "inquiry_records_internal_notes" ALTER COLUMN "author_id" SET NOT NULL;
  ALTER TABLE "inquiry_records_internal_notes" DROP COLUMN "author_label";`)
}
