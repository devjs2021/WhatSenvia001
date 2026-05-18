CREATE TABLE "bot_ai_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) DEFAULT 'google' NOT NULL,
	"model" varchar(100) DEFAULT 'gemini-2.0-flash-exp' NOT NULL,
	"api_key" text,
	"system_prompt" text,
	"business_info" text,
	"faqs" text,
	"welcome_message" text,
	"temperature" varchar(10) DEFAULT '0.7',
	"max_tokens" varchar(10) DEFAULT '1000',
	"activation_keywords" text,
	"support_number" varchar(20),
	"rag_files" jsonb DEFAULT '[]'::jsonb,
	"rag_enabled" boolean DEFAULT false NOT NULL,
	"bot_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_ai_config_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bot_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"session_id" uuid,
	"nodes" jsonb DEFAULT '[]'::jsonb,
	"edges" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" varchar(20) DEFAULT 'hybrid' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_control_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(50) NOT NULL,
	"config_value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_control_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "campaign_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_metrics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"message" text NOT NULL,
	"media_url" varchar(500),
	"media_type" varchar(50),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"target_tags" jsonb DEFAULT '[]'::jsonb,
	"total_contacts" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"messages_per_minute" integer DEFAULT 8 NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"remote_jid" varchar(100),
	"content" text NOT NULL,
	"direction" varchar(10) NOT NULL,
	"sender_type" varchar(10) NOT NULL,
	"whatsapp_message_id" varchar(100),
	"push_name" varchar(255),
	"status" varchar(20) DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"contact_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(50) DEFAULT 'demo' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"max_sessions" integer DEFAULT 1 NOT NULL,
	"max_contacts" integer DEFAULT 100 NOT NULL,
	"max_campaigns_per_day" integer DEFAULT 2 NOT NULL,
	"max_messages_per_day" integer DEFAULT 100 NOT NULL,
	"features" jsonb DEFAULT '{"campaigns":true,"botBuilder":false,"chatLive":true,"polls":false,"scheduledCampaigns":false,"contactExtraction":false,"import":true,"reports":false,"templates":true,"campaignControl":false}'::jsonb NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"campaign_id" uuid,
	"phone" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"media_url" varchar(500),
	"media_type" varchar(50),
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"whatsapp_message_id" varchar(100),
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"multi_select" boolean DEFAULT false NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_responses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_campaign_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"selected_options" jsonb NOT NULL,
	"whatsapp_message_id" varchar(100),
	"responded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_sent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_campaign_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"whatsapp_message_id" varchar(100) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"contact_list_id" uuid,
	"contacts" jsonb NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_contacts" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"options" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"facebook_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"status" varchar(20) DEFAULT 'disconnected' NOT NULL,
	"connection_type" varchar(20) DEFAULT 'baileys' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"qr_code" text,
	"waba_id" varchar(100),
	"meta_phone_number_id" varchar(100),
	"meta_access_token" text,
	"meta_business_id" varchar(100),
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_ai_config" ADD CONSTRAINT "bot_ai_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_flows" ADD CONSTRAINT "bot_flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_flows" ADD CONSTRAINT "bot_flows_session_id_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_session_id_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_list_id_contact_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_campaigns" ADD CONSTRAINT "poll_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_campaigns" ADD CONSTRAINT "poll_campaigns_session_id_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_poll_campaign_id_poll_campaigns_id_fk" FOREIGN KEY ("poll_campaign_id") REFERENCES "public"."poll_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_sent_messages" ADD CONSTRAINT "poll_sent_messages_poll_campaign_id_poll_campaigns_id_fk" FOREIGN KEY ("poll_campaign_id") REFERENCES "public"."poll_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_campaigns" ADD CONSTRAINT "scheduled_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_flows_user_id_idx" ON "bot_flows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bot_flows_status_idx" ON "bot_flows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chat_messages_session_phone_idx" ON "chat_messages" USING btree ("session_id","phone");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_list_members_list_id_idx" ON "contact_list_members" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "contact_list_members_phone_idx" ON "contact_list_members" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contact_lists_user_id_idx" ON "contact_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "message_templates_user_id_idx" ON "message_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_campaign_id_idx" ON "messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_contact_id_idx" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "poll_campaigns_user_id_idx" ON "poll_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "poll_campaigns_created_idx" ON "poll_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "poll_responses_campaign_idx" ON "poll_responses" USING btree ("poll_campaign_id");--> statement-breakpoint
CREATE INDEX "poll_responses_phone_idx" ON "poll_responses" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "poll_sent_msg_campaign_idx" ON "poll_sent_messages" USING btree ("poll_campaign_id");--> statement-breakpoint
CREATE INDEX "poll_sent_msg_wa_id_idx" ON "poll_sent_messages" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_sessions_user_id_idx" ON "whatsapp_sessions" USING btree ("user_id");