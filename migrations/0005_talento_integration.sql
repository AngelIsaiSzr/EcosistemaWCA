CREATE TABLE IF NOT EXISTS "integration_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"schema" jsonb NOT NULL,
	"spreadsheet_id" text,
	"spreadsheet_tab" text DEFAULT 'Respuestas',
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"email" text NOT NULL,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_responses" ADD CONSTRAINT "integration_responses_form_id_integration_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."integration_forms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_responses_form_email_unique" ON "integration_responses" ("form_id", "email");
