import { useMemo } from 'react';
import { useSwitchChain } from 'wagmi';
import { getChain } from '../utils/chainConfig';
import { SUPPORTED_SWAP_CHAINS, isChainSupportedForSwap } from '../config/tokenLists';

export default function UnsupportedChainBanner({ currentChainId }) {
  const { switchChain, isPending } = useSwitchChain();
  const supportedChains = useMemo(
    () =>
      SUPPORTED_SWAP_CHAINS.map((id) => getChain(id)).filter(Boolean),
    []
  );

  if (!currentChainId) return null;

  const isSupported = isChainSupportedForSwap(currentChainId);
  if (isSupported) return null;

  const handleSwitch = (chainId) => {
    switchChain?.({ chainId });
  };

  return (
    <div className="mb-4 p-4 rounded-xl bg-amber-500/20 border border-amber-500/50">
      <p className="text-amber-200 text-sm mb-3">This network is not supported for swapping. Switch to a supported chain:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {supportedChains.map((chain) => {
          const id = parseInt(chain.chainId, 10);
          return (
            <button
              key={chain.chainId}
              type="button"
              onClick={() => handleSwitch(id)}
              disabled={!switchChain || isPending}
              className="py-2 px-3 rounded-lg bg-[#3CF902] text-black font-medium text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed truncate"
            >
              {chain.chainName ?? `Chain ${id}`}
            </button>
          );
        })}
      </div>
      {isPending && <p className="text-amber-200/80 text-xs mt-2">Switching...</p>}
    </div>
  );
}
