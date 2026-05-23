CREATE TYPE "public"."user_role" AS ENUM('customer', 'partner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."partner_availability_status" AS ENUM('online', 'offline', 'busy');--> statement-breakpoint
CREATE TYPE "public"."partner_booking_status" AS ENUM('EN_ROUTE', 'ARRIVED', 'WORKING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('HOME', 'OFFICE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('PERCENTAGE', 'FLAT');--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('INSTANT', 'SCHEDULED', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."recurring_type" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."booking_instance_status" AS ENUM('SCHEDULED', 'PENDING_MATCH', 'MATCHED', 'ARRIVING', 'STARTED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING_PAYMENT', 'PENDING_MATCH', 'MATCHED', 'ARRIVING', 'STARTED', 'COMPLETED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."cancellation_reason" AS ENUM('USER_REQUESTED', 'PARTNER_UNAVAILABLE', 'NO_PARTNERS_FOUND', 'PAYMENT_FAILED', 'SYSTEM_ERROR', 'WEATHER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('UPI', 'CARD', 'NETBANKING', 'WALLET', 'COD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."rating_status" AS ENUM('PENDING', 'SUBMITTED', 'DISCARDED');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('EARNED', 'USED', 'EXPIRED', 'REFUNDED', 'ADJUSTED');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_status" AS ENUM('PENDING', 'CREDITED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_type" AS ENUM('DISCOUNT', 'CREDIT', 'CASHBACK');--> statement-breakpoint
CREATE TYPE "public"."complaint_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"session_id" uuid,
	"device_id" varchar(128),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notifications_enabled" boolean DEFAULT true,
	"sms_enabled" boolean DEFAULT true,
	"email_enabled" boolean DEFAULT true,
	"language" varchar(10) DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(255),
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"profile_image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"referral_code" varchar(20),
	"referred_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "partner_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" double precision,
	"heading" double precision,
	"speed" double precision,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transaction_id" varchar(100),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"availability_status" "partner_availability_status" DEFAULT 'offline' NOT NULL,
	"aadhar_number" varchar(20),
	"pan_number" varchar(20),
	"bank_account_number" varchar(30),
	"bank_ifsc_code" varchar(20),
	"bank_name" varchar(100),
	"average_rating" numeric(3, 2) DEFAULT '0',
	"total_ratings" integer DEFAULT 0,
	"total_bookings" integer DEFAULT 0,
	"completed_bookings" integer DEFAULT 0,
	"total_earnings" numeric(12, 2) DEFAULT '0',
	"service_radius" integer DEFAULT 10,
	"documents" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100),
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"landmark" varchar(255),
	"area" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"pincode" varchar(10) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"type" "address_type" DEFAULT 'HOME' NOT NULL,
	"bhk" integer,
	"bathroom" integer,
	"balcony" integer,
	"floor" integer,
	"building_name" varchar(255),
	"house_no" varchar(50),
	"other_name" varchar(100),
	"other_phone" varchar(20),
	"is_default" boolean DEFAULT false,
	"can_delete" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"micro_hub_id" uuid,
	"day_start_time" varchar(10) DEFAULT '06:00',
	"day_closing_time" varchar(10) DEFAULT '21:00',
	"serviceable_end_hour" integer DEFAULT 21,
	"slot_duration" integer DEFAULT 60,
	"buffer_time" integer DEFAULT 30,
	"max_bookings_per_slot" integer DEFAULT 5,
	"surge_multiplier" double precision DEFAULT 1,
	"surge_threshold" integer DEFAULT 80,
	"area_feature_config" jsonb,
	"kit_config" jsonb,
	"is_instant_enabled" boolean DEFAULT true,
	"is_scheduled_enabled" boolean DEFAULT true,
	"is_recurring_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius" integer DEFAULT 10,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hubs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "micro_hubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius" integer DEFAULT 5,
	"pincodes" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "micro_hubs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image" text,
	"original_price" numeric(10, 2),
	"bundle_price" numeric(10, 2) NOT NULL,
	"discount_percentage" numeric(5, 2),
	"valid_from" timestamp,
	"valid_till" timestamp,
	"max_usage" integer,
	"current_usage" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bundles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_id" uuid NOT NULL,
	"dependent_on" varchar(50),
	"dependent_value" varchar(100),
	"price" numeric(10, 2) NOT NULL,
	"discounted_price" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"discounted_price" numeric(10, 2),
	"unit" varchar(50),
	"min_quantity" integer DEFAULT 1,
	"max_quantity" integer DEFAULT 10,
	"step_quantity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"icon" text,
	"image" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"short_description" text,
	"image" text,
	"images" text[],
	"base_price" numeric(10, 2) NOT NULL,
	"duration" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "coupon_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"discount_applied" numeric(10, 2) NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"max_discount" numeric(10, 2),
	"min_cart_value" numeric(10, 2),
	"max_usage_total" integer,
	"max_usage_per_user" integer DEFAULT 1,
	"current_usage_total" integer DEFAULT 0,
	"applicable_categories" uuid[],
	"applicable_listings" uuid[],
	"excluded_categories" uuid[],
	"excluded_listings" uuid[],
	"is_first_time_only" boolean DEFAULT false,
	"valid_from" timestamp NOT NULL,
	"valid_till" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"listing_item_id" varchar(255),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"is_quick_add" boolean DEFAULT false,
	"property_config" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"address_id" uuid,
	"bundle_id" uuid,
	"coupon_id" uuid,
	"booking_type" "booking_type" DEFAULT 'SCHEDULED' NOT NULL,
	"recurring_type" "recurring_type",
	"time_slot" jsonb,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_after_discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gst_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"surge_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"final_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"surge_applicable" boolean DEFAULT false,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_booking_id" uuid NOT NULL,
	"parent_booking_id" uuid NOT NULL,
	"partner_id" uuid,
	"instance_number" integer NOT NULL,
	"status" "booking_instance_status" DEFAULT 'SCHEDULED' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_time" varchar(20),
	"rescheduled_from" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"property_config" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid,
	"micro_hub_id" uuid,
	"date" timestamp NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"max_capacity" integer DEFAULT 10 NOT NULL,
	"current_bookings" integer DEFAULT 0,
	"is_available" boolean DEFAULT true NOT NULL,
	"surge_multiplier" double precision DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_instance_id" uuid,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_number" varchar(50) NOT NULL,
	"idempotency_key" varchar(255),
	"user_id" uuid NOT NULL,
	"partner_id" uuid,
	"address_id" uuid NOT NULL,
	"hub_id" uuid,
	"micro_hub_id" uuid,
	"bundle_id" uuid,
	"coupon_id" uuid,
	"parent_booking_id" uuid,
	"order_id" uuid,
	"status" "booking_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"booking_type" "booking_type" DEFAULT 'SCHEDULED' NOT NULL,
	"recurring_type" "recurring_type",
	"scheduled_date" timestamp,
	"scheduled_start_time" varchar(20),
	"scheduled_end_time" varchar(20),
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" "cancellation_reason",
	"cancellation_note" text,
	"subtotal" numeric(12, 2),
	"total_price" numeric(12, 2),
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"gst_amount" numeric(12, 2) DEFAULT '0',
	"surge_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2),
	"final_amount" numeric(12, 2),
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"estimated_duration" integer,
	"actual_duration" integer,
	"customer_notes" text,
	"partner_notes" text,
	"admin_notes" text,
	"cancellation_awaiting_partner_ack" boolean DEFAULT false NOT NULL,
	"partner_release_acknowledged_at" timestamp,
	"cancellation_requested_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"request_hash" varchar(64) NOT NULL,
	"response_code" integer,
	"response_body" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_user_id_resource_type_unique" UNIQUE("key","user_id","resource_type")
);
--> statement-breakpoint
CREATE TABLE "recurring_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"recurring_type" "recurring_type" NOT NULL,
	"recurring_days" integer[],
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"total_instances" integer,
	"completed_instances" integer DEFAULT 0,
	"cancelled_instances" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"booking_id" uuid,
	"user_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'CREATED' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"juspay_order_id" varchar(100),
	"juspay_client_auth_token" text,
	"juspay_client_auth_token_expiry" timestamp,
	"payment_method_id" varchar(100),
	"payment_method" "payment_method",
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" varchar(100) NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"payment_method" "payment_method",
	"payment_method_details" jsonb,
	"juspay_txn_id" varchar(100),
	"bank_reference_number" varchar(100),
	"authorization_code" varchar(50),
	"gateway_response" jsonb,
	"error_code" varchar(50),
	"error_message" text,
	"captured_at" timestamp,
	"failed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refund_id" varchar(100) NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"booking_id" uuid,
	"user_id" uuid NOT NULL,
	"status" "refund_status" DEFAULT 'INITIATED' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"juspay_refund_id" varchar(100),
	"gateway_response" jsonb,
	"initiated_by" uuid,
	"processed_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_refund_id_unique" UNIQUE("refund_id")
);
--> statement-breakpoint
CREATE TABLE "saved_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "payment_method" NOT NULL,
	"display_name" varchar(100),
	"token" text,
	"card_last_four" varchar(4),
	"card_brand" varchar(20),
	"card_expiry_month" varchar(2),
	"card_expiry_year" varchar(4),
	"upi_id" varchar(100),
	"upi_provider" varchar(50),
	"wallet_type" varchar(50),
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"partner_id" uuid,
	"status" "rating_status" DEFAULT 'PENDING' NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"tags" text[],
	"service_quality" integer,
	"punctuality" integer,
	"professionalism" integer,
	"cleanliness" integer,
	"is_anonymous" boolean DEFAULT false,
	"partner_response" text,
	"partner_responded_at" timestamp,
	"discarded_at" timestamp,
	"discard_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_before" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"description" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"max_usage" integer,
	"current_usage" integer DEFAULT 0,
	"reward_type" "referral_reward_type" DEFAULT 'CREDIT',
	"referrer_reward" numeric(10, 2),
	"referee_reward" numeric(10, 2),
	"valid_from" timestamp DEFAULT now(),
	"valid_till" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"referrer_reward_status" "referral_reward_status" DEFAULT 'PENDING' NOT NULL,
	"referee_reward_status" "referral_reward_status" DEFAULT 'PENDING' NOT NULL,
	"referrer_reward_amount" numeric(10, 2),
	"referee_reward_amount" numeric(10, 2),
	"referrer_credited_at" timestamp,
	"referee_credited_at" timestamp,
	"trigger_booking_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lifetime_earned" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lifetime_used" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "complaint_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"attachments" text[],
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"category" varchar(100),
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "complaint_priority" DEFAULT 'MEDIUM' NOT NULL,
	"assigned_to" uuid,
	"resolved_at" timestamp,
	"resolution" text,
	"attachments" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "fcm_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"device_type" varchar(20),
	"device_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_for_users" uuid[],
	"enabled_for_percentage" varchar(5),
	"conditions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(50),
	"image_url" text,
	"action_url" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_availability" ADD CONSTRAINT "partner_availability_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_locations" ADD CONSTRAINT "partner_locations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_configs" ADD CONSTRAINT "hub_configs_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_configs" ADD CONSTRAINT "hub_configs_micro_hub_id_micro_hubs_id_fk" FOREIGN KEY ("micro_hub_id") REFERENCES "public"."micro_hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_hubs" ADD CONSTRAINT "micro_hubs_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_pricing" ADD CONSTRAINT "catalog_pricing_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_instances" ADD CONSTRAINT "booking_instances_recurring_booking_id_recurring_bookings_id_fk" FOREIGN KEY ("recurring_booking_id") REFERENCES "public"."recurring_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_instances" ADD CONSTRAINT "booking_instances_parent_booking_id_bookings_id_fk" FOREIGN KEY ("parent_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_instances" ADD CONSTRAINT "booking_instances_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_micro_hub_id_micro_hubs_id_fk" FOREIGN KEY ("micro_hub_id") REFERENCES "public"."micro_hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_instance_id_booking_instances_id_fk" FOREIGN KEY ("booking_instance_id") REFERENCES "public"."booking_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_micro_hub_id_micro_hubs_id_fk" FOREIGN KEY ("micro_hub_id") REFERENCES "public"."micro_hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "partner_locations_partner_id_idx" ON "partner_locations" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_locations_partner_recorded_idx" ON "partner_locations" USING btree ("partner_id","recorded_at");--> statement-breakpoint
CREATE INDEX "bookings_user_id_status_idx" ON "bookings" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "bookings_partner_id_idx" ON "bookings" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_partner_schedule_unique" ON "bookings" USING btree ("partner_id","scheduled_date","scheduled_start_time") WHERE "bookings"."status" NOT IN ('CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_booking_id_idx" ON "orders" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_order_uuid_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");