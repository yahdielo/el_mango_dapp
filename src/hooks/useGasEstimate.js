import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { ROUTER_ABI } from '../config/abis';
import { ZERO_ADDRESS, getRouterAddress, getGasSettings, getNativeCurrency } from '../utils/chainConfig';
import { isNativeToken } from './useTokenBalance';

/**
 * Estimate gas for swap and compute approximate cost in native currency.
 * Only for same-chain swaps; cross-chain uses bridge deposit (disable to avoid viem errors).
 * @param {Object} params
 * @param {Object} params.tokenIn
 * @param {Object} params.tokenOut
 * @param {string} params.amountIn
 * @param {number} params.chainId
 * @param {number} params.slippageBps
 * @param {string} [params.referrer]
 * @param {boolean} [params.enabled=true] - Set false for cross-chain (tokenOut is on another chain)
 * @returns {{ gasEstimate: bigint|null, gasCostWei: bigint|null, gasCostFormatted: string|null, loading: boolean }}
 */
export function useGasEstimate({ tokenIn, tokenOut, amountIn, chainId, slippageBps, referrer = ZERO_ADDRESS, enabled = true }) {
  const [gasEstimate, setGasEstimate] = useState(null);
  const [gasCostWei, setGasCostWei] = useState(null);
  const [loading, setLoading] = useState(false);

  const publicClient = usePublicClient({ chainId });
  const routerAddress = getRouterAddress(chainId);
  const gasSettings = getGasSettings(chainId);
  const fallbackGas = BigInt(gasSettings?.gasLimit ?? 500000);

  useEffect(() => {
    const amt = amountIn?.trim?.() ?? '';
    if (
      !enabled ||
      !tokenIn?.symbol ||
      !tokenOut?.symbol ||
      !amt ||
      parseFloat(amt) <= 0 ||
      !chainId ||
      !routerAddress ||
      !publicClient
    ) {
      setGasEstimate(null);
      setGasCostWei(null);
      return;
    }

    setLoading(true);
    const token0 = isNativeToken(tokenIn) ? ZERO_ADDRESS : tokenIn.address;
    const token1 = isNativeToken(tokenOut) ? ZERO_ADDRESS : tokenOut.address;
    const dec = tokenIn?.decimals ?? 18;
    let amountWei;
    try {
      amountWei = parseUnits(amt, dec);
    } catch {
      setLoading(false);
      return;
    }
    // MangoRouter002: 4 params (token0, token1, amount, referrer) — no slippage param
    const finalArgs = isNativeToken(tokenIn)
      ? [token0, token1, 0n, referrer || ZERO_ADDRESS]
      : [token0, token1, amountWei, referrer || ZERO_ADDRESS];

    const run = async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          address: routerAddress,
          abi: ROUTER_ABI,
          functionName: 'swap',
          args: finalArgs,
          account: '0x0000000000000000000000000000000000000001',
          ...(isNativeToken(tokenIn) ? { value: amountWei } : {}),
        });
        setGasEstimate(gas);

        const gasPrice = await publicClient.getGasPrice().catch(() => null);
        if (gasPrice != null) {
          setGasCostWei(gas * gasPrice);
        } else {
          setGasCostWei(null);
        }
      } catch {
        setGasEstimate(fallbackGas);
        try {
          const gasPrice = await publicClient.getGasPrice();
          setGasCostWei(fallbackGas * gasPrice);
        } catch {
          setGasCostWei(null);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    enabled,
    tokenIn,
    tokenOut,
    amountIn,
    chainId,
    referrer,
    routerAddress,
    publicClient,
    fallbackGas,
  ]);

  const native = getNativeCurrency(chainId);
  let gasCostFormatted = null;
  if (gasCostWei != null && gasCostWei > 0n) {
    const formatted = formatUnits(gasCostWei, native.decimals);
    const num = parseFloat(formatted);
    const display = num < 0.0001 ? '<0.0001' : num < 1 ? num.toFixed(4) : num.toFixed(2);
    gasCostFormatted = `~${display} ${native.symbol}`;
  }

  return { gasEstimate, gasCostWei, gasCostFormatted, loading };
}
