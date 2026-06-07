export function formatCurrency(
  amountInMinorUnits: number,
  currency: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    ...options,
  }).format(amountInMinorUnits / 100);
}
