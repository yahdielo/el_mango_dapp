import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ERC20_ABI, ROUTER_ABI } from '../config/abis';
import { ZERO_ADDRESS, getRouterAddress, getExplorerUrl, getGasSettings } from '../utils/chainConfig';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import { isNativeToken } from './useTokenBalance';

/**
 * @param {Object} params
 * @param {Object} params.tokenIn - Token being paid
 * @param {Object} params.tokenOut - Token being received
 * @param {string} params.amountIn - Amount string
 * @param {string} params.amountOut - Expected output (for display)
 * @param {number} params.chainId
 * @param {number} params.slippageBps - Slippage in basis points
 * @param {string} params.address - User wallet address
 * @param {string} [params.referrer] - Referrer address (default ZERO)
 * @returns {{ executeSwap: () => Promise<void>, isPending: boolean, error: string|null, txHash: string|null, reset: () => void, isSuccess: boolean, explorerUrl: string|null }}
 */
export function useSwap({
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  chainId,
  slippageBps,
  address,
  referrer = ZERO_ADDRESS,
}) {
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const routerAddress = getRouterAddress(chainId);
  const gasSettings = getGasSettings(chainId);
  const gasConfig = { gas: BigInt(gasSettings?.gasLimit ?? 500000) };

  const amountWeiForAllowance = amountIn && !isNativeToken(tokenIn) && tokenIn?.decimals != null
    ? parseUnits(String(parseFloat(amountIn) || 0), tokenIn.decimals)
    : 0n;

  const { data: allowance } = useReadContract({
    address: !isNativeToken(tokenIn) ? tokenIn?.address : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && routerAddress ? [address, routerAddress] : undefined,
    chainId,
    query: { enabled: Boolean(!isNativeToken(tokenIn) && tokenIn?.address && address && routerAddress && amountIn) },
  });

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isPending = isWritePending || isConfirming;

  const reset = useCallback(() => {
    setTxHash(null);
    setError(null);
  }, []);

  const executeSwap = useCallback(async () => {
    if (!address || !tokenIn || !tokenOut || !amountIn || !chainId || !routerAddress) {
      setError('Missing required params');
      return;
    }

    const amt = parseFloat(amountIn);
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Invalid amount');
      return;
    }

    setError(null);
    const token0 = isNativeToken(tokenIn) ? ZERO_ADDRESS : tokenIn.address;
    const token1 = isNativeToken(tokenOut) ? ZERO_ADDRESS : tokenOut.address;
    const dec = tokenIn?.decimals ?? 18;
    const amountWei = parseUnits(amountIn, dec);

    try {
      if (!isNativeToken(tokenIn) && (allowance == null || allowance < amountWei)) {
        await writeContractAsync({
          address: tokenIn.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, amountWei],
          chainId,
        });
      }

      // MangoRouter002: 4 params (token0, token1, amount, referrer) — no slippage param
      const finalArgs = isNativeToken(tokenIn)
        ? [token0, token1, 0n, referrer || ZERO_ADDRESS]
        : [token0, token1, amountWei, referrer || ZERO_ADDRESS];

      const hash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: 'swap',
        args: finalArgs,
        chainId,
        ...(isNativeToken(tokenIn) ? { value: amountWei } : {}),
        ...gasConfig,
      });

      setTxHash(hash);
    } catch (err) {
      setError(mapErrorToUserMessage(err));
    }
  }, [
    address,
    tokenIn,
    tokenOut,
    amountIn,
    chainId,
    referrer,
    routerAddress,
    writeContractAsync,
    allowance,
  ]);

  return {
    executeSwap,
    isPending,
    error,
    txHash,
    reset,
    isSuccess,
    explorerUrl: txHash && chainId ? getExplorerUrl(chainId, txHash) : null,
  };
}
