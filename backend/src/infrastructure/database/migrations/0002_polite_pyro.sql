-- Nota: `drizzle-kit generate` intentó incluir aquí varias tablas/columnas que
-- ya existen en producción (creadas antes mediante bloques ad-hoc en server.ts,
-- no con migraciones). Ese contenido se retiró a propósito para no romper el
-- arranque: esta migración solo crea lo genuinamente nuevo (notification_emails).
CREATE TABLE IF NOT EXISTS "notification_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_emails_user_id_email" UNIQUE("user_id","email")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification_emails" ADD CONSTRAINT "notification_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_emails_user_id_idx" ON "notification_emails" USING btree ("user_id");
