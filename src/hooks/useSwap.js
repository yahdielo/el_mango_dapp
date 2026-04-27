import { useState, useCallback, useMemo } from 'react';
import { parseUnits, parseAbiItem, decodeEventLog } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { ERC20_ABI, ROUTER_ABI, MANGO_REFERRAL_ABI } from '../config/abis';
import { ZERO_ADDRESS, getRouterAddress, getExplorerUrl, getGasSettings, getMangoReferralContractAddress } from '../utils/chainConfig';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import { isNativeToken } from './useTokenBalance';
import { isPolygonBridgedWethSwap, POLYGON_USE_WMATIC_MESSAGE } from '../utils/mangoRouterPolygonSupport';

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
const SWAP_EVENT_ABI = parseAbiItem(
  'event Swap(address indexed swapper, address indexed token0, address indexed token1, uint256 amountIn, uint256 amountOut, uint256 chainId, uint256 blockTimestamp, uint256 gasPrice, uint256 blockNumber)'
);

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
  // MetaMask may still preflight-simulate with provided `gas`.
  // Use a larger limit to reduce "likely to fail" due to underestimation.
  // useMemo keeps the object reference stable so it doesn't break useCallback deps.
  const gasConfig = useMemo(
    () => ({ gas: BigInt(gasSettings?.gasLimit ?? 500000) * 2n }),
    [gasSettings?.gasLimit],
  );
  const publicClient = usePublicClient({ chainId });

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

    if (isPolygonBridgedWethSwap(chainId, tokenIn, tokenOut)) {
      setError(POLYGON_USE_WMATIC_MESSAGE);
      return;
    }

    // Hard guard: block if the quote returned zero output (no liquidity / unsupported pair).
    const expectedOut = parseFloat(amountOut);
    if (!amountOut || Number.isNaN(expectedOut) || expectedOut <= 0) {
      setError('Cannot swap — no valid quote (output is 0). There may be no liquidity for this pair on this network. Try switching to Base or Arbitrum.');
      return;
    }

    setError(null);
    const token0 = isNativeToken(tokenIn) ? ZERO_ADDRESS : tokenIn.address;
    const token1 = isNativeToken(tokenOut) ? ZERO_ADDRESS : tokenOut.address;
    const dec = tokenIn?.decimals ?? 18;
    const amountWei = parseUnits(amountIn, dec);

    try {
      // Referral payouts can revert the whole swap if the chain's MangoReferral
      // contract isn't properly configured (whitelist/funded/paused).
      // We keep the referrer for tracking, but disable payout for this tx if unsafe.
      let effectiveReferrer = referrer || ZERO_ADDRESS;
      if (effectiveReferrer && effectiveReferrer !== ZERO_ADDRESS) {
        const referralContract = getMangoReferralContractAddress(chainId);
        if (!referralContract) {
          effectiveReferrer = ZERO_ADDRESS;
        } else {
          try {
            const [isPaused, isRouterWhitelisted, mangoTokenAddr] = await Promise.all([
              publicClient.readContract({
                address: referralContract,
                abi: MANGO_REFERRAL_ABI,
                functionName: 'chainPaused',
                args: [BigInt(chainId)],
              }),
              publicClient.readContract({
                address: referralContract,
                abi: MANGO_REFERRAL_ABI,
                functionName: 'whiteListed',
                args: [routerAddress],
              }),
              publicClient.readContract({
                address: referralContract,
                abi: MANGO_REFERRAL_ABI,
                functionName: 'mangoToken',
              }),
            ]);

            if (isPaused || !isRouterWhitelisted || !mangoTokenAddr || mangoTokenAddr === ZERO_ADDRESS) {
              effectiveReferrer = ZERO_ADDRESS;
            } else {
              const referralTokenBal = await publicClient.readContract({
                address: mangoTokenAddr,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [referralContract],
              });
              if (referralTokenBal == null || referralTokenBal === 0n) effectiveReferrer = ZERO_ADDRESS;
            }
          } catch {
            // Fail-safe: if any read fails, don't risk swapping with referral payout.
            effectiveReferrer = ZERO_ADDRESS;
          }
        }
      }

      if (!isNativeToken(tokenIn) && (allowance == null || allowance < amountWei)) {
        const approveHash = await writeContractAsync({
          address: tokenIn.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, amountWei],
          chainId,
        });
        // Ensure allowance is updated before sending the swap tx.
        // Otherwise the swap may revert during MetaMask simulation (allowance still 0).
        if (!publicClient?.waitForTransactionReceipt) {
          throw new Error('Approval transaction sent but receipt polling is unavailable; try again in a moment.');
        }
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approvalReceipt?.status != null && approvalReceipt.status !== 'success' && approvalReceipt.status !== 1) {
          throw new Error('Approval transaction failed; cannot perform swap.');
        }
      }

      // MangoRouter002: 4 params (token0, token1, amount, referrer) — no slippage param
      const finalArgs = isNativeToken(tokenIn)
        ? [token0, token1, 0n, effectiveReferrer || ZERO_ADDRESS]
        : [token0, token1, amountWei, effectiveReferrer || ZERO_ADDRESS];

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

      // Post-transaction check: parse the Swap event to verify amountOut > 0.
      if (publicClient?.waitForTransactionReceipt) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          let swapAmountOut = null;
          for (const log of receipt.logs ?? []) {
            try {
              const decoded = decodeEventLog({ abi: [SWAP_EVENT_ABI], data: log.data, topics: log.topics });
              if (decoded?.eventName === 'Swap') {
                swapAmountOut = decoded.args.amountOut;
                break;
              }
            } catch { /* not our event */ }
          }
          if (swapAmountOut !== null && swapAmountOut === 0n) {
            setError('Swap succeeded on-chain but you received 0 tokens. The pool may have no liquidity for this pair. Check your wallet and contact support if funds are missing.');
          }
        } catch { /* receipt parsing is best-effort */ }
      }
    } catch (err) {
      setError(mapErrorToUserMessage(err));
    }
  }, [
    address,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    chainId,
    referrer,
    routerAddress,
    publicClient,
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
