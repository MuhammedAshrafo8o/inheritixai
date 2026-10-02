import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_home_selected_work_section_story_card_source" AS ENUM('manual', 'featuredProject');
  ALTER TABLE "page_home" ADD COLUMN "selected_work_section_story_card_source" "enum_page_home_selected_work_section_story_card_source" DEFAULT 'manual';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_home" DROP COLUMN "selected_work_section_story_card_source";
  DROP TYPE "public"."enum_page_home_selected_work_section_story_card_source";`)
}
