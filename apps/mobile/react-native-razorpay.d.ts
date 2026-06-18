declare module "react-native-razorpay" {
  interface RazorpayCheckoutOptions {
    key: string
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

  interface RazorpaySuccessResult {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResult>
  }

  export default RazorpayCheckout
}
