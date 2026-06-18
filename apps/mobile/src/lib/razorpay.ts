import RazorpayCheckout from "react-native-razorpay"

export interface RazorpayCheckoutParams {
  key_id: string
  amount: number
  currency: string
  order_id: string
  name?: string
  description?: string
  prefill?: {
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export function openRazorpayCheckout(
  params: RazorpayCheckoutParams
): Promise<RazorpayCheckoutResult> {
  return RazorpayCheckout.open({
    key: params.key_id,
    amount: params.amount,
    currency: params.currency,
    order_id: params.order_id,
    name: params.name ?? "Subito",
    description: params.description,
    prefill: params.prefill,
    theme: params.theme ?? { color: "#111827" },
  }) as Promise<RazorpayCheckoutResult>
}
