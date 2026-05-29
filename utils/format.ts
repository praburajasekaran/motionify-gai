export function formatCurrency(amountInMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amountInMinorUnits / 100);
}
