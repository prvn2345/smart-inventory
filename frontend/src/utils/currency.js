// Currency formatting utility — Indian Rupees
export const CURRENCY_SYMBOL = '₹';

/**
 * Format a number as Indian Rupees
 * e.g. formatCurrency(1234.5) → "₹1,234.50"
 */
export const formatCurrency = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format in compact form (K / L / Cr)
 * e.g. formatCurrencyCompact(150000) → "₹1.5L"
 */
export const formatCurrencyCompact = (amount) => {
  if (!amount) return `${CURRENCY_SYMBOL}0`;
  if (amount >= 10000000) return `${CURRENCY_SYMBOL}${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `${CURRENCY_SYMBOL}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(0)}`;
};
