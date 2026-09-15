ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "tech_human_specialization" boolean DEFAULT false;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "lxp_enrollment_url" text;
