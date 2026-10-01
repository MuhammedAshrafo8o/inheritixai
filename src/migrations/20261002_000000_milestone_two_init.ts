import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres"

/**
 * Milestone Two Database Migration:
 * Initial schema for Inheritix Payload CMS on PostgreSQL
 * Includes users, media, clients, projects, products, services, posts,
 * categories, authors, redirects, globals, and draft versioning.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Ensure UUID and crypto extensions if supported
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users Table
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "email" varchar NOT NULL UNIQUE,
      "reset_password_token" varchar,
      "reset_password_expiration" timestamp(3) with time zone,
      "salt" varchar,
      "hash" varchar,
      "login_attempts" numeric DEFAULT 0,
      "lock_until" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "users_roles" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "value" varchar NOT NULL,
      PRIMARY KEY ("parent_id", "order")
    );

    -- Media Table
    CREATE TABLE IF NOT EXISTS "media" (
      "id" serial PRIMARY KEY,
      "alt_en" varchar NOT NULL,
      "alt_ar" varchar NOT NULL,
      "description_en" text,
      "description_ar" text,
      "caption_en" varchar,
      "caption_ar" varchar,
      "filename" varchar NOT NULL,
      "mime_type" varchar NOT NULL,
      "filesize" numeric NOT NULL,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Clients Table
    CREATE TABLE IF NOT EXISTS "clients" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "logo_id" integer REFERENCES "media"("id") ON DELETE RESTRICT,
      "logo_description_en" varchar NOT NULL,
      "logo_description_ar" varchar NOT NULL,
      "website" varchar,
      "display_mode" varchar DEFAULT 'original',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Categories Table
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" serial PRIMARY KEY,
      "slug" varchar NOT NULL UNIQUE,
      "name_en" varchar NOT NULL,
      "name_ar" varchar NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Authors Table
    CREATE TABLE IF NOT EXISTS "authors" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "initials" varchar DEFAULT 'IN',
      "role_en" varchar DEFAULT 'INHERITIX Editorial',
      "role_ar" varchar DEFAULT 'فريق تحرير إينهيريتكس',
      "avatar_id" integer REFERENCES "media"("id") ON DELETE SET NULL,
      "bio_en" text,
      "bio_ar" text,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Projects Table & Versions
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" serial PRIMARY KEY,
      "slug" varchar NOT NULL UNIQUE,
      "title_en" varchar NOT NULL,
      "title_ar" varchar NOT NULL,
      "client_id" integer REFERENCES "clients"("id") ON DELETE RESTRICT,
      "summary_en" text NOT NULL,
      "summary_ar" text NOT NULL,
      "intro_en" text,
      "intro_ar" text,
      "sector_en" varchar NOT NULL,
      "sector_ar" varchar NOT NULL,
      "year" varchar DEFAULT '2026' NOT NULL,
      "featured" boolean DEFAULT false,
      "display_order" numeric DEFAULT 0,
      "card_image_id" integer REFERENCES "media"("id") ON DELETE RESTRICT,
      "hero_image_id" integer REFERENCES "media"("id") ON DELETE RESTRICT,
      "_status" varchar DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "_projects_v" (
      "id" serial PRIMARY KEY,
      "parent_id" integer REFERENCES "projects"("id") ON DELETE CASCADE,
      "version" jsonb NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean DEFAULT true
    );

    -- Products Table & Versions
    CREATE TABLE IF NOT EXISTS "products" (
      "id" serial PRIMARY KEY,
      "slug" varchar NOT NULL UNIQUE,
      "name" varchar NOT NULL,
      "badge" varchar NOT NULL,
      "category_en" varchar NOT NULL,
      "category_ar" varchar NOT NULL,
      "tagline_en" varchar NOT NULL,
      "tagline_ar" varchar NOT NULL,
      "summary_en" text NOT NULL,
      "summary_ar" text NOT NULL,
      "hero_headline_en" varchar NOT NULL,
      "hero_headline_ar" varchar NOT NULL,
      "hero_description_en" text NOT NULL,
      "hero_description_ar" text NOT NULL,
      "visual_type" varchar DEFAULT 'dashboard',
      "display_order" numeric DEFAULT 0,
      "_status" varchar DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Services Table & Versions
    CREATE TABLE IF NOT EXISTS "services" (
      "id" serial PRIMARY KEY,
      "number" varchar NOT NULL,
      "slug" varchar NOT NULL UNIQUE,
      "title_en" varchar NOT NULL,
      "title_ar" varchar NOT NULL,
      "short_description_en" text NOT NULL,
      "short_description_ar" text NOT NULL,
      "hero_intro_en" text,
      "hero_intro_ar" text,
      "problem_eyebrow_en" varchar,
      "problem_eyebrow_ar" varchar,
      "problem_heading_en" varchar,
      "problem_heading_ar" varchar,
      "problem_description_en" text,
      "problem_description_ar" text,
      "deliverables_eyebrow_en" varchar,
      "deliverables_eyebrow_ar" varchar,
      "deliverables_heading_en" varchar,
      "deliverables_heading_ar" varchar,
      "process_eyebrow_en" varchar,
      "process_eyebrow_ar" varchar,
      "process_heading_en" varchar,
      "process_heading_ar" varchar,
      "process_description_en" text,
      "process_description_ar" text,
      "next_eyebrow_en" varchar,
      "next_eyebrow_ar" varchar,
      "next_heading_en" varchar,
      "next_heading_ar" varchar,
      "display_order" numeric DEFAULT 0,
      "_status" varchar DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Posts Table & Versions
    CREATE TABLE IF NOT EXISTS "posts" (
      "id" serial PRIMARY KEY,
      "title_en" varchar NOT NULL,
      "title_ar" varchar NOT NULL,
      "slug" varchar NOT NULL UNIQUE,
      "category_id" integer REFERENCES "categories"("id") ON DELETE SET NULL,
      "author_id" integer REFERENCES "authors"("id") ON DELETE SET NULL,
      "published_at" timestamp(3) with time zone,
      "read_time" varchar DEFAULT '7 min read',
      "color" varchar DEFAULT 'ink',
      "excerpt_en" text,
      "excerpt_ar" text,
      "lead_paragraph_en" text,
      "lead_paragraph_ar" text,
      "cover_image_id" integer REFERENCES "media"("id") ON DELETE SET NULL,
      "_status" varchar DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Redirects Table
    CREATE TABLE IF NOT EXISTS "redirects" (
      "id" serial PRIMARY KEY,
      "from" varchar NOT NULL UNIQUE,
      "to" varchar NOT NULL,
      "status_code" varchar DEFAULT '308' NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Payload Globals Table
    CREATE TABLE IF NOT EXISTS "payload_globals" (
      "id" serial PRIMARY KEY,
      "slug" varchar NOT NULL UNIQUE,
      "data" jsonb NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Payload Migrations Table
    CREATE TABLE IF NOT EXISTS "payload_migrations" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "batch" numeric NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "payload_migrations" CASCADE;
    DROP TABLE IF EXISTS "payload_globals" CASCADE;
    DROP TABLE IF EXISTS "redirects" CASCADE;
    DROP TABLE IF EXISTS "posts" CASCADE;
    DROP TABLE IF EXISTS "services" CASCADE;
    DROP TABLE IF EXISTS "products" CASCADE;
    DROP TABLE IF EXISTS "_projects_v" CASCADE;
    DROP TABLE IF EXISTS "projects" CASCADE;
    DROP TABLE IF EXISTS "authors" CASCADE;
    DROP TABLE IF EXISTS "categories" CASCADE;
    DROP TABLE IF EXISTS "clients" CASCADE;
    DROP TABLE IF EXISTS "media" CASCADE;
    DROP TABLE IF EXISTS "users_roles" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;
  `)
}
