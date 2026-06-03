CREATE TABLE IF NOT EXISTS "lead_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"author_name" varchar(255),
	"body" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_user_id_users_id_fk";
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_owner_id_users_id_fk";
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_assigned_to_users_id_fk";
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_owner_id_users_id_fk";
ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "founder_investments" DROP CONSTRAINT IF EXISTS "founder_investments_user_id_users_id_fk";
ALTER TABLE "founder_investments" ADD CONSTRAINT "founder_investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "internal_documents" DROP CONSTRAINT IF EXISTS "internal_documents_uploaded_by_id_users_id_fk";
ALTER TABLE "internal_documents" ADD CONSTRAINT "internal_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "lead_comments" DROP CONSTRAINT IF EXISTS "lead_comments_lead_id_leads_id_fk";
ALTER TABLE "lead_comments" ADD CONSTRAINT "lead_comments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
