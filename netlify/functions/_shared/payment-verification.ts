import crypto from 'crypto';

export function getRazorpayKeySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured');
  }
  return secret;
}

export function verifyRazorpayCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  if (!/^[a-f0-9]{64}$/i.test(params.signature)) return false;
  const secret = params.secret || getRazorpayKeySecret();
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(params.signature, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}
