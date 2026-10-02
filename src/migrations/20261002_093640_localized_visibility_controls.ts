import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_home_locales" ADD COLUMN "showcase_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "selected_work_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "selected_work_section_story_card_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "capabilities_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "products_dark_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "approach_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "perspective_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home_locales" ADD COLUMN "insights_section_visible" boolean DEFAULT true;
  ALTER TABLE "site_labels_locales" ADD COLUMN "article_cta_visible" boolean DEFAULT true;
  -- Visibility was previously shared. Copy its current value into every
  -- existing locale row before removing the shared columns, so both English
  -- and Arabic begin with exactly the same editorial state.
  UPDATE "page_home_locales" AS "localized"
  SET
    "showcase_section_visible" = "source"."showcase_section_visible",
    "selected_work_section_visible" = "source"."selected_work_section_visible",
    "selected_work_section_story_card_visible" = "source"."selected_work_section_story_card_visible",
    "capabilities_section_visible" = "source"."capabilities_section_visible",
    "products_dark_section_visible" = "source"."products_dark_section_visible",
    "approach_section_visible" = "source"."approach_section_visible",
    "perspective_section_visible" = "source"."perspective_section_visible",
    "insights_section_visible" = "source"."insights_section_visible"
  FROM "page_home" AS "source"
  WHERE "localized"."_parent_id" = "source"."id";
  UPDATE "site_labels_locales" AS "localized"
  SET "article_cta_visible" = "source"."article_cta_visible"
  FROM "site_labels" AS "source"
  WHERE "localized"."_parent_id" = "source"."id";
  ALTER TABLE "page_home" DROP COLUMN "showcase_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "selected_work_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "selected_work_section_story_card_visible";
  ALTER TABLE "page_home" DROP COLUMN "capabilities_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "products_dark_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "approach_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "perspective_section_visible";
  ALTER TABLE "page_home" DROP COLUMN "insights_section_visible";
  ALTER TABLE "site_labels" DROP COLUMN "article_cta_visible";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_home" ADD COLUMN "showcase_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "selected_work_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "selected_work_section_story_card_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "capabilities_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "products_dark_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "approach_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "perspective_section_visible" boolean DEFAULT true;
  ALTER TABLE "page_home" ADD COLUMN "insights_section_visible" boolean DEFAULT true;
  ALTER TABLE "site_labels" ADD COLUMN "article_cta_visible" boolean DEFAULT true;
  -- A shared rollback column cannot represent two locale values. Restore the
  -- English value (or retain the default when an English row does not exist).
  UPDATE "page_home" AS "target"
  SET
    "showcase_section_visible" = "localized"."showcase_section_visible",
    "selected_work_section_visible" = "localized"."selected_work_section_visible",
    "selected_work_section_story_card_visible" = "localized"."selected_work_section_story_card_visible",
    "capabilities_section_visible" = "localized"."capabilities_section_visible",
    "products_dark_section_visible" = "localized"."products_dark_section_visible",
    "approach_section_visible" = "localized"."approach_section_visible",
    "perspective_section_visible" = "localized"."perspective_section_visible",
    "insights_section_visible" = "localized"."insights_section_visible"
  FROM "page_home_locales" AS "localized"
  WHERE "localized"."_parent_id" = "target"."id" AND "localized"."_locale" = 'en';
  UPDATE "site_labels" AS "target"
  SET "article_cta_visible" = "localized"."article_cta_visible"
  FROM "site_labels_locales" AS "localized"
  WHERE "localized"."_parent_id" = "target"."id" AND "localized"."_locale" = 'en';
  ALTER TABLE "page_home_locales" DROP COLUMN "showcase_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "selected_work_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "selected_work_section_story_card_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "capabilities_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "products_dark_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "approach_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "perspective_section_visible";
  ALTER TABLE "page_home_locales" DROP COLUMN "insights_section_visible";
  ALTER TABLE "site_labels_locales" DROP COLUMN "article_cta_visible";`)
}
