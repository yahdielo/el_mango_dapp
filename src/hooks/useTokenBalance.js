import { useMemo } from 'react';
import { useReadContract, useBalance } from 'wagmi';
import { ERC20_ABI } from '../config/abis';
import { formatBalanceDisplay } from '../utils/formatBalance';
export { isNativeToken } from '../utils/tokenUtils';

/**
 * @param {Object} params
 * @param {string} [params.address] - Wallet address
 * @param {Object} [params.token] - Token { address, decimals, native? }
 * @param {number} [params.chainId] - Chain ID
 * @returns {{ balance: bigint|undefined, formattedBalance: string, isLoading: boolean, error: Error|null }}
 */
export function useTokenBalance({ address, token, chainId }) {
  const isNative = isNativeToken(token);

  const balanceQuery = useBalance({
    address,
    token: isNative ? undefined : token?.address,
    chainId,
    query: { enabled: Boolean(address && (isNative || token?.address) && chainId) },
  });

  const contractQuery = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: Boolean(address && token?.address && !isNative && chainId) }
  });

  return useMemo(() => {
    if (isNative) {
      const { data, isLoading, error } = balanceQuery;
      const balance = data?.value;
      const decimals = token?.decimals ?? 18;
      return {
        balance,
        formattedBalance: balance != null ? formatBalanceDisplay(balance, decimals) : '0',
        isLoading,
        error: error ?? null,
      };
    }
    const { data, isLoading, error } = contractQuery;
    const balance = data;
    const decimals = token?.decimals ?? 18;
    return {
      balance,
      formattedBalance: balance != null ? formatBalanceDisplay(balance, decimals) : '0',
      isLoading,
      error: error ?? null,
    };
  }, [
    isNative,
    balanceQuery.data?.value,
    balanceQuery.isLoading,
    balanceQuery.error,
    contractQuery.data,
    contractQuery.isLoading,
    contractQuery.error,
    token?.decimals,
  ]);
}
