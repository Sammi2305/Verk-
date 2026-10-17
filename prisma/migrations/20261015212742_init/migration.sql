-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'TRADESPERSON', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY_EMAIL', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "QualificationType" AS ENUM ('JOURNEYMAN', 'MASTER', 'LICENSE', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('FLEXIBLE', 'WITHIN_WEEK', 'URGENT');

-- CreateEnum
CREATE TYPE "JobRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'BOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'SELECTED', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'ESTIMATE', 'HOURLY', 'INSPECTION');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('PLATFORM', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED_COMPLETED', 'RESOLVED_CANCELLED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('RECORDED', 'INVOICED', 'PAID', 'WAIVED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'TEST_CAPTURED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(3),
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT NOT NULL DEFAULT 'is',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_is" TEXT NOT NULL,
    "name_en" TEXT,
    "description_is" TEXT,
    "license_relevant" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tradesperson_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "company_id" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "public_phone" TEXT,
    "years_experience" INTEGER,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "accepting_requests" BOOLEAN NOT NULL DEFAULT true,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by_id" TEXT,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tradesperson_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tradesperson_categories" (
    "profile_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "tradesperson_categories_pkey" PRIMARY KEY ("profile_id","category_id")
);

-- CreateTable
CREATE TABLE "tradesperson_areas" (
    "profile_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,

    CONSTRAINT "tradesperson_areas_pkey" PRIMARY KEY ("profile_id","area_id")
);

-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "category_id" TEXT,
    "type" "QualificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "reference_no" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(3),
    "verified_by_id" TEXT,
    "admin_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "code" "PlanCode" NOT NULL,
    "name_is" TEXT NOT NULL,
    "monthly_price_isk" INTEGER NOT NULL,
    "per_job_fee_isk" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "plan_code" "PlanCode" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "vat_rate_percent" INTEGER NOT NULL DEFAULT 24,
    "prices_include_vat" BOOLEAN NOT NULL DEFAULT false,
    "billing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_invites_per_request" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requests" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "preferred_from" DATE,
    "preferred_to" DATE,
    "urgency" "Urgency" NOT NULL DEFAULT 'FLEXIBLE',
    "status" "JobRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_invitations" (
    "id" TEXT NOT NULL,
    "job_request_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "price_type" "PriceType",
    "price_amount_isk" INTEGER,
    "price_note" TEXT,
    "proposed_start" TIMESTAMPTZ(3),
    "proposed_end" TIMESTAMPTZ(3),
    "message" TEXT,
    "decline_reason" TEXT,
    "responded_at" TIMESTAMPTZ(3),
    "seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "job_request_id" TEXT,
    "invitation_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'PLATFORM',
    "status" "BookingStatus" NOT NULL DEFAULT 'ACCEPTED',
    "price_type" "PriceType" NOT NULL,
    "price_amount_isk" INTEGER,
    "price_note" TEXT,
    "scheduled_start" TIMESTAMPTZ(3),
    "scheduled_end" TIMESTAMPTZ(3),
    "completion_reported_at" TIMESTAMPTZ(3),
    "completion_confirmed_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_id" TEXT,
    "cancel_reason" TEXT,
    "fee_eligible" BOOLEAN,
    "fee_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "previous_status" "BookingStatus" NOT NULL,
    "resolution" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_charges" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "plan_code" "PlanCode" NOT NULL,
    "amount_isk" INTEGER NOT NULL,
    "vat_rate_percent" INTEGER NOT NULL,
    "amount_includes_vat" BOOLEAN NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'RECORDED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_adjustments" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "from_status" "ChargeStatus" NOT NULL,
    "to_status" "ChargeStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "job_request_id" TEXT,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text_body" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "is_test" BOOLEAN NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_token_hash_key" ON "email_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_tokens_user_id_type_idx" ON "email_tokens"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "areas_slug_key" ON "areas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tradesperson_profiles_user_id_key" ON "tradesperson_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tradesperson_profiles_slug_key" ON "tradesperson_profiles"("slug");

-- CreateIndex
CREATE INDEX "tradesperson_profiles_status_idx" ON "tradesperson_profiles"("status");

-- CreateIndex
CREATE INDEX "tradesperson_categories_category_id_idx" ON "tradesperson_categories"("category_id");

-- CreateIndex
CREATE INDEX "tradesperson_areas_area_id_idx" ON "tradesperson_areas"("area_id");

-- CreateIndex
CREATE INDEX "qualifications_profile_id_idx" ON "qualifications"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_profile_id_key" ON "subscriptions"("profile_id");

-- CreateIndex
CREATE INDEX "job_requests_customer_id_status_idx" ON "job_requests"("customer_id", "status");

-- CreateIndex
CREATE INDEX "job_invitations_profile_id_status_idx" ON "job_invitations"("profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_invitations_job_request_id_profile_id_key" ON "job_invitations"("job_request_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_job_request_id_key" ON "bookings"("job_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_invitation_id_key" ON "bookings"("invitation_id");

-- CreateIndex
CREATE INDEX "bookings_profile_id_status_idx" ON "bookings"("profile_id", "status");

-- CreateIndex
CREATE INDEX "bookings_customer_id_status_idx" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_booking_id_created_at_idx" ON "messages"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_charges_booking_id_key" ON "platform_charges"("booking_id");

-- CreateIndex
CREATE INDEX "platform_charges_profile_id_status_idx" ON "platform_charges"("profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uploads_storage_key_key" ON "uploads"("storage_key");

-- CreateIndex
CREATE INDEX "uploads_job_request_id_idx" ON "uploads"("job_request_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "email_outbox_to_email_created_at_idx" ON "email_outbox"("to_email", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_profiles" ADD CONSTRAINT "tradesperson_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_profiles" ADD CONSTRAINT "tradesperson_profiles_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_categories" ADD CONSTRAINT "tradesperson_categories_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_categories" ADD CONSTRAINT "tradesperson_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_areas" ADD CONSTRAINT "tradesperson_areas_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradesperson_areas" ADD CONSTRAINT "tradesperson_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_invitations" ADD CONSTRAINT "job_invitations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_invitations" ADD CONSTRAINT "job_invitations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "job_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_charges" ADD CONSTRAINT "platform_charges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_charges" ADD CONSTRAINT "platform_charges_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tradesperson_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_adjustments" ADD CONSTRAINT "charge_adjustments_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "platform_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_adjustments" ADD CONSTRAINT "charge_adjustments_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────── Hand-written constraints (not expressible in Prisma) ─────────

-- A tradesperson cannot have two overlapping active bookings.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "bookings" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "profile_id" WITH =,
    tstzrange("scheduled_start", "scheduled_end", '[)') WITH &&
  ) WHERE ("status" IN ('SCHEDULED', 'IN_PROGRESS'));

ALTER TABLE "bookings" ADD CONSTRAINT "booking_time_order"
  CHECK ("scheduled_end" IS NULL OR "scheduled_start" IS NULL OR "scheduled_end" > "scheduled_start");
ALTER TABLE "bookings" ADD CONSTRAINT "booking_scheduled_has_time"
  CHECK ("status" NOT IN ('SCHEDULED', 'IN_PROGRESS') OR ("scheduled_start" IS NOT NULL AND "scheduled_end" IS NOT NULL));
ALTER TABLE "bookings" ADD CONSTRAINT "booking_price_nonneg"
  CHECK ("price_amount_isk" IS NULL OR "price_amount_isk" >= 0);
ALTER TABLE "job_invitations" ADD CONSTRAINT "invitation_price_nonneg"
  CHECK ("price_amount_isk" IS NULL OR "price_amount_isk" >= 0);
ALTER TABLE "platform_charges" ADD CONSTRAINT "charge_amount_nonneg" CHECK ("amount_isk" >= 0);
ALTER TABLE "plans" ADD CONSTRAINT "plan_prices_nonneg" CHECK ("monthly_price_isk" >= 0 AND "per_job_fee_isk" >= 0);
ALTER TABLE "platform_settings" ADD CONSTRAINT "settings_singleton" CHECK ("id" = 1);
ALTER TABLE "platform_settings" ADD CONSTRAINT "settings_vat_range" CHECK ("vat_rate_percent" BETWEEN 0 AND 100);
