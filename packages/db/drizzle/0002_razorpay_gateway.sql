ALTER TABLE "orders" RENAME COLUMN "juspay_order_id" TO "gateway_order_id";
ALTER TABLE "payments" RENAME COLUMN "juspay_txn_id" TO "gateway_txn_id";
ALTER TABLE "refunds" RENAME COLUMN "juspay_refund_id" TO "gateway_refund_id";

ALTER TABLE "orders" ADD COLUMN "gateway_data" jsonb;
ALTER TABLE "payments" ADD COLUMN "gateway_data" jsonb;
ALTER TABLE "refunds" ADD COLUMN "gateway_data" jsonb;

UPDATE "orders"
SET "gateway_data" = jsonb_strip_nulls(
  jsonb_build_object(
    'clientAuthToken',
    "juspay_client_auth_token",
    'clientAuthTokenExpiry',
    "juspay_client_auth_token_expiry"
  )
)
WHERE "juspay_client_auth_token" IS NOT NULL
   OR "juspay_client_auth_token_expiry" IS NOT NULL;

ALTER TABLE "orders" DROP COLUMN "juspay_client_auth_token";
ALTER TABLE "orders" DROP COLUMN "juspay_client_auth_token_expiry";
