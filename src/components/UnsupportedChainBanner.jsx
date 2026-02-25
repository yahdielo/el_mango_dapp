import { useSwitchChain } from 'wagmi';
import { getChain } from '../utils/chainConfig';
import { getFirstSupportedChain, isChainSupportedForSwap } from '../config/tokenLists';

export default function UnsupportedChainBanner({ currentChainId }) {
  const targetChainId = getFirstSupportedChain();
  const { switchChain, isPending } = useSwitchChain();
  const targetChain = getChain(targetChainId);
  const targetName = targetChain?.chainName ?? 'Base';

  if (!currentChainId) return null;

  const isSupported = isChainSupportedForSwap(currentChainId);
  if (isSupported) return null;

  const handleSwitch = () => {
    switchChain?.({ chainId: targetChainId });
  };

  return (
    <div className="mb-4 p-4 rounded-xl bg-amber-500/20 border border-amber-500/50">
      <p className="text-amber-200 text-sm mb-2">This network is not supported for swapping.</p>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={!switchChain || isPending}
        className="w-full py-2 rounded-lg bg-[#3CF902] text-black font-medium text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Switching...' : `Switch to ${targetName}`}
      </button>
    </div>
  );
}
