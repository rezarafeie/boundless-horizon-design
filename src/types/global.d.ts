
export {};

declare global {
  interface Window {
    debugPayment?: (
      method: 'stripe' | 'nowpayments' | 'manual' | 'zarinpal',
      type: 'info' | 'error' | 'success' | 'warning',
      message: string,
      data?: any
    ) => void;
  }
}
