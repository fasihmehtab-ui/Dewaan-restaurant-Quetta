/**
 * Currency formatting utility for Pakistani Rupees (PKR / Rs.)
 */
export function formatPKR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rs. 0';
  }
  // Standard Pakistani Rupee formatting without unnecessary cents
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatPKRDelta(amount: number): string {
  if (amount === 0) return 'Included';
  const prefix = amount > 0 ? '+Rs. ' : '-Rs. ';
  return `${prefix}${Math.round(Math.abs(amount)).toLocaleString('en-PK')}`;
}
