/** Map HyperSDK process_result payload to server process-order status. */

export type ProcessOrderClientStatus =
  | "SUCCESS"
  | "CHARGED"
  | "FAILED"
  | "PENDING"

export function mapHyperPayloadToProcessOrder(
  payload: Record<string, unknown>
): { status: ProcessOrderClientStatus; txnId?: string } {
  const statusRaw = String(
    payload.status ??
      payload.txnStatus ??
      payload.paymentStatus ??
      payload.payment_status ??
      ""
  ).toUpperCase()

  const txnId =
    (typeof payload.txnId === "string" && payload.txnId) ||
    (typeof payload.txn_uuid === "string" && payload.txn_uuid) ||
    (typeof payload.txnUuid === "string" && payload.txnUuid) ||
    (typeof payload.udf10 === "string" && payload.udf10) ||
    undefined

  if (
    statusRaw.includes("SUCCESS") ||
    statusRaw === "CHARGED" ||
    statusRaw === "AUTHORIZATION_SUCCEEDED" ||
    statusRaw === "CAPTURED"
  ) {
    return { status: "SUCCESS", txnId }
  }

  if (
    statusRaw.includes("FAIL") ||
    statusRaw === "USER_ABORTED" ||
    statusRaw === "BACKPRESS" ||
    payload.error === true
  ) {
    return { status: "FAILED", txnId }
  }

  return { status: "PENDING", txnId }
}
