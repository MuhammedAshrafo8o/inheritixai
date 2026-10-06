import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiry_records_inquiry_type" AS ENUM('project', 'demo', 'general');
  CREATE TYPE "public"."enum_inquiry_records_submission_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_inquiry_records_workflow_status" AS ENUM('new', 'in-progress', 'closed', 'spam');
  CREATE TYPE "public"."enum_inquiry_records_notification_status" AS ENUM('pending', 'processing', 'accepted', 'retry-wait', 'failed', 'disabled', 'uncertain');
  CREATE TYPE "public"."enum_email_settings_encryption_mode" AS ENUM('starttls', 'implicit-tls', 'none');
  CREATE TYPE "public"."enum_email_settings_last_connection_test_status" AS ENUM('never', 'succeeded', 'failed');
  CREATE TYPE "public"."enum_email_settings_last_test_email_status" AS ENUM('never', 'accepted', 'failed');
  CREATE TABLE "inquiry_records_internal_notes" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "note" varchar NOT NULL,
    "author_id" integer NOT NULL,
    "created_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "inquiry_records" (
    "id" serial PRIMARY KEY NOT NULL,
    "public_reference" varchar NOT NULL,
    "idempotency_key" varchar NOT NULL,
    "payload_hash" varchar NOT NULL,
    "inquiry_type" "enum_inquiry_records_inquiry_type" NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "message" varchar NOT NULL,
    "submission_locale" "enum_inquiry_records_submission_locale" NOT NULL,
    "submitted_at" timestamp(3) with time zone NOT NULL,
    "product_id" integer,
    "service_id" integer,
    "selection_label_snapshot" varchar,
    "source_path" varchar NOT NULL,
    "attribution_utm_source" varchar,
    "attribution_utm_medium" varchar,
    "attribution_utm_campaign" varchar,
    "attribution_referrer" varchar,
    "workflow_status" "enum_inquiry_records_workflow_status" DEFAULT 'new' NOT NULL,
    "unread" boolean DEFAULT true NOT NULL,
    "notification_status" "enum_inquiry_records_notification_status" NOT NULL,
    "notification_attempts" numeric DEFAULT 0 NOT NULL,
    "notification_next_attempt_at" timestamp(3) with time zone,
    "notification_locked_at" timestamp(3) with time zone,
    "notification_failure_code" varchar,
    "notification_last_attempt_at" timestamp(3) with time zone,
    "notification_accepted_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "inquiry_rate_limits" (
    "id" serial PRIMARY KEY NOT NULL,
    "bucket_key" varchar NOT NULL,
    "count" numeric DEFAULT 0 NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "email_secrets" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "ciphertext" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "email_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "notifications_enabled" boolean DEFAULT false,
    "smtp_host" varchar,
    "smtp_port" numeric DEFAULT 587,
    "encryption_mode" "enum_email_settings_encryption_mode" DEFAULT 'starttls' NOT NULL,
    "smtp_username" varchar,
    "password_configured" boolean DEFAULT false,
    "sender_name" varchar,
    "sender_email" varchar,
    "notification_recipient" varchar,
    "submission_limit_per_hour" numeric DEFAULT 10 NOT NULL,
    "admin_test_limit_per_hour" numeric DEFAULT 5 NOT NULL,
    "last_connection_test_status" "enum_email_settings_last_connection_test_status" DEFAULT 'never',
    "last_connection_test_at" timestamp(3) with time zone,
    "last_connection_test_code" varchar,
    "last_test_email_status" "enum_email_settings_last_test_email_status" DEFAULT 'never',
    "last_test_email_at" timestamp(3) with time zone,
    "last_test_email_code" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_direct_contact_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_project_tab" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_demo_tab" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_general_tab" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_project_heading" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_demo_heading" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_general_heading" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_name_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_email_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_product_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_service_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_message_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_submit_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_status_label" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_name_error" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_email_error" SET NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_message_error" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiry_records_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiry_rate_limits_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_secrets_id" integer;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_submitting_label" varchar DEFAULT 'Sending…' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_success_title" varchar DEFAULT 'Inquiry received' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_success_message" varchar DEFAULT 'Thank you. Your inquiry is safely recorded and our team will review it.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_reference_label" varchar DEFAULT 'Reference' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_validation_summary" varchar DEFAULT 'Please review the highlighted fields.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_rate_limited_message" varchar DEFAULT 'Too many inquiries were sent recently. Please wait and try again.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_temporary_failure_message" varchar DEFAULT 'We could not record your inquiry right now. Your entries are preserved; please try again.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_conflict_message" varchar DEFAULT 'This submission changed while it was being retried. Please start a new inquiry.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_retry_label" varchar DEFAULT 'Try again' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_product_required_error" varchar DEFAULT 'Choose an available product.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_service_required_error" varchar DEFAULT 'Choose an available service.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_selection_unavailable_message" varchar DEFAULT 'No eligible choices are available for this inquiry type right now.' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_general_inquiry_link" varchar DEFAULT 'Continue with a general inquiry' NOT NULL;
  ALTER TABLE "page_contact_locales" ADD COLUMN "form_honeypot_label" varchar DEFAULT 'Website (leave this field empty)' NOT NULL;
  -- New localized operational copy must not inherit English column defaults in
  -- existing Arabic rows. Existing editorial fields are otherwise untouched.
  UPDATE "page_contact_locales" SET
    "form_submitting_label" = 'جارٍ الإرسال…',
    "form_success_title" = 'تم استلام استفسارك',
    "form_success_message" = 'شكرًا لك. تم تسجيل استفسارك بأمان وسيراجعه فريقنا.',
    "form_reference_label" = 'الرقم المرجعي',
    "form_validation_summary" = 'يرجى مراجعة الحقول المحددة.',
    "form_rate_limited_message" = 'تم إرسال عدد كبير من الاستفسارات مؤخرًا. يرجى الانتظار والمحاولة مرة أخرى.',
    "form_temporary_failure_message" = 'تعذر تسجيل استفسارك الآن. تم الاحتفاظ بالبيانات؛ يرجى المحاولة مرة أخرى.',
    "form_conflict_message" = 'تغير هذا الاستفسار أثناء إعادة المحاولة. يرجى بدء استفسار جديد.',
    "form_retry_label" = 'حاول مرة أخرى',
    "form_product_required_error" = 'اختر منتجًا متاحًا.',
    "form_service_required_error" = 'اختر خدمة متاحة.',
    "form_selection_unavailable_message" = 'لا توجد خيارات مؤهلة لهذا النوع من الاستفسار حاليًا.',
    "form_general_inquiry_link" = 'المتابعة باستفسار عام',
    "form_honeypot_label" = 'الموقع الإلكتروني (اترك هذا الحقل فارغًا)'
  WHERE "_locale" = 'ar';
  ALTER TABLE "inquiry_records_internal_notes" ADD CONSTRAINT "inquiry_records_internal_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiry_records_internal_notes" ADD CONSTRAINT "inquiry_records_internal_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."inquiry_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiry_records" ADD CONSTRAINT "inquiry_records_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiry_records" ADD CONSTRAINT "inquiry_records_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "inquiry_records_internal_notes_order_idx" ON "inquiry_records_internal_notes" USING btree ("_order");
  CREATE INDEX "inquiry_records_internal_notes_parent_id_idx" ON "inquiry_records_internal_notes" USING btree ("_parent_id");
  CREATE INDEX "inquiry_records_internal_notes_author_idx" ON "inquiry_records_internal_notes" USING btree ("author_id");
  CREATE UNIQUE INDEX "inquiry_records_public_reference_idx" ON "inquiry_records" USING btree ("public_reference");
  CREATE UNIQUE INDEX "inquiry_records_idempotency_key_idx" ON "inquiry_records" USING btree ("idempotency_key");
  CREATE INDEX "inquiry_records_inquiry_type_idx" ON "inquiry_records" USING btree ("inquiry_type");
  CREATE INDEX "inquiry_records_name_idx" ON "inquiry_records" USING btree ("name");
  CREATE INDEX "inquiry_records_email_idx" ON "inquiry_records" USING btree ("email");
  CREATE INDEX "inquiry_records_submitted_at_idx" ON "inquiry_records" USING btree ("submitted_at");
  CREATE INDEX "inquiry_records_product_idx" ON "inquiry_records" USING btree ("product_id");
  CREATE INDEX "inquiry_records_service_idx" ON "inquiry_records" USING btree ("service_id");
  CREATE INDEX "inquiry_records_workflow_status_idx" ON "inquiry_records" USING btree ("workflow_status");
  CREATE INDEX "inquiry_records_unread_idx" ON "inquiry_records" USING btree ("unread");
  CREATE INDEX "inquiry_records_notification_status_idx" ON "inquiry_records" USING btree ("notification_status");
  CREATE INDEX "inquiry_records_notification_next_attempt_at_idx" ON "inquiry_records" USING btree ("notification_next_attempt_at");
  CREATE INDEX "inquiry_records_notification_locked_at_idx" ON "inquiry_records" USING btree ("notification_locked_at");
  CREATE INDEX "inquiry_records_updated_at_idx" ON "inquiry_records" USING btree ("updated_at");
  CREATE INDEX "inquiry_records_created_at_idx" ON "inquiry_records" USING btree ("created_at");
  CREATE UNIQUE INDEX "inquiry_rate_limits_bucket_key_idx" ON "inquiry_rate_limits" USING btree ("bucket_key");
  CREATE INDEX "inquiry_rate_limits_expires_at_idx" ON "inquiry_rate_limits" USING btree ("expires_at");
  CREATE INDEX "inquiry_rate_limits_updated_at_idx" ON "inquiry_rate_limits" USING btree ("updated_at");
  CREATE INDEX "inquiry_rate_limits_created_at_idx" ON "inquiry_rate_limits" USING btree ("created_at");
  CREATE UNIQUE INDEX "email_secrets_key_idx" ON "email_secrets" USING btree ("key");
  CREATE INDEX "email_secrets_updated_at_idx" ON "email_secrets" USING btree ("updated_at");
  CREATE INDEX "email_secrets_created_at_idx" ON "email_secrets" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiry_records_fk" FOREIGN KEY ("inquiry_records_id") REFERENCES "public"."inquiry_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiry_rate_limits_fk" FOREIGN KEY ("inquiry_rate_limits_id") REFERENCES "public"."inquiry_rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_secrets_fk" FOREIGN KEY ("email_secrets_id") REFERENCES "public"."email_secrets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_inquiry_records_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiry_records_id");
  CREATE INDEX "payload_locked_documents_rels_inquiry_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiry_rate_limits_id");
  CREATE INDEX "payload_locked_documents_rels_email_secrets_id_idx" ON "payload_locked_documents_rels" USING btree ("email_secrets_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiry_records_internal_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiry_records" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiry_rate_limits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_secrets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "inquiry_records_internal_notes" CASCADE;
  DROP TABLE "inquiry_records" CASCADE;
  DROP TABLE "inquiry_rate_limits" CASCADE;
  DROP TABLE "email_secrets" CASCADE;
  DROP TABLE "email_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiry_records_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiry_rate_limits_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_secrets_fk";

  DROP INDEX "payload_locked_documents_rels_inquiry_records_id_idx";
  DROP INDEX "payload_locked_documents_rels_inquiry_rate_limits_id_idx";
  DROP INDEX "payload_locked_documents_rels_email_secrets_id_idx";
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_direct_contact_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_project_tab" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_demo_tab" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_general_tab" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_project_heading" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_demo_heading" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_general_heading" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_name_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_email_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_product_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_service_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_message_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_submit_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_status_label" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_name_error" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_email_error" DROP NOT NULL;
  ALTER TABLE "page_contact_locales" ALTER COLUMN "form_message_error" DROP NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiry_records_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiry_rate_limits_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_secrets_id";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_submitting_label";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_success_title";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_success_message";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_reference_label";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_validation_summary";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_rate_limited_message";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_temporary_failure_message";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_conflict_message";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_retry_label";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_product_required_error";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_service_required_error";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_selection_unavailable_message";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_general_inquiry_link";
  ALTER TABLE "page_contact_locales" DROP COLUMN "form_honeypot_label";
  DROP TYPE "public"."enum_inquiry_records_inquiry_type";
  DROP TYPE "public"."enum_inquiry_records_submission_locale";
  DROP TYPE "public"."enum_inquiry_records_workflow_status";
  DROP TYPE "public"."enum_inquiry_records_notification_status";
  DROP TYPE "public"."enum_email_settings_encryption_mode";
  DROP TYPE "public"."enum_email_settings_last_connection_test_status";
  DROP TYPE "public"."enum_email_settings_last_test_email_status";`)
}
