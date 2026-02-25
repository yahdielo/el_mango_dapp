import { useMemo } from 'react';

function parseAmountToBigInt(amountStr, decimals = 18) {
  const amt = amountStr?.trim?.() ?? '';
  if (!amt || amt === '.') return null;
  const parts = amt.split('.');
  const intPart = (parts[0] || '0').replace(/^0+/, '') || '0';
  const fracPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  try {
    return BigInt(intPart + fracPart);
  } catch {
    return null;
  }
}

/**
 * @param {Object} params
 * @param {string} params.amount - Input amount string
 * @param {Object} [params.tokenIn] - Token { decimals }
 * @param {bigint} [params.balance] - Raw balance
 * @param {string} [params.address] - Wallet address
 * @returns {{ canSwap: boolean, error: string }}
 */
export function useSwapValidation({ amount, tokenIn, balance, address }) {
  return useMemo(() => {
    if (!address) return { canSwap: false, error: 'Connect wallet' };
    const amt = amount?.trim?.() ?? '';
    if (!amt || amt === '0' || amt === '0.') return { canSwap: false, error: 'Enter amount' };
    const amountBigInt = parseAmountToBigInt(amt, tokenIn?.decimals ?? 18);
    if (amountBigInt == null || amountBigInt <= 0n) return { canSwap: false, error: 'Enter amount' };
    if (balance != null && balance < amountBigInt) return { canSwap: false, error: 'Insufficient balance' };
    return { canSwap: true, error: '' };
  }, [amount, tokenIn?.decimals, balance, address]);
}
