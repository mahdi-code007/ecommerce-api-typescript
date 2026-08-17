CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" varchar(2000),
	"price_in_minor_units" integer NOT NULL,
	"stock" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"rating_average" double precision DEFAULT 0 NOT NULL,
	"ratings_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_unique" UNIQUE("name"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_name_min_length" CHECK (char_length("products"."name") >= 3),
	CONSTRAINT "products_price_positive" CHECK ("products"."price_in_minor_units" >= 1),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_rating_average_range" CHECK ("products"."rating_average" >= 0 AND "products"."rating_average" <= 5),
	CONSTRAINT "products_ratings_count_non_negative" CHECK ("products"."ratings_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");