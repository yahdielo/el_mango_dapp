export default function SwapHeader({ address, onConnect, onOpenWalletConnect }) {
  const formatAddress = (addr) => {
    if (!addr) return 'Connect';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative flex items-center justify-between mb-5 h-11">
      <div className="w-10 shrink-0" aria-hidden="true" />
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <button
          onClick={onConnect}
          type="button"
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111] rounded-lg"
          aria-label={address ? 'Open wallet menu' : 'Connect wallet'}
        >
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-[#3CF902] flex items-center justify-center">
            <span className="text-black font-bold text-sm">{address ? address[0].toUpperCase() : 'C'}</span>
          </div>
          <span className="text-white text-[16px] font-normal">{formatAddress(address)}</span>
          <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
            <path d="M1.5 1.5L6.5 6.5L11.5 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!address && onOpenWalletConnect && (
          <button
            type="button"
            onClick={onOpenWalletConnect}
            className="text-[#3CF902] text-xs hover:underline focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-1 focus:ring-offset-[#111111] rounded px-1 -my-0.5"
            aria-label="Connect with WalletConnect or other wallets"
          >
            WalletConnect / Other wallets
          </button>
        )}
      </div>
      <button
        type="button"
        className="absolute right-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#D9D9D9] flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111]"
        aria-label="Add wallet"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 1V4H0V6H3V9H5V6H8V4H5V1H3ZM9 4V7H6V10H3V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C20.11 22 21 21.11 21 20V19H12C11.4696 19 10.9609 18.7893 10.5858 18.4142C10.2107 18.0391 10 17.5304 10 17V9C10 8.46957 10.2107 7.96086 10.5858 7.58579C10.9609 7.21071 11.4696 7 12 7H21V6C21 5.46957 20.7893 4.96086 20.4142 4.58579C20.0391 4.21071 19.5304 4 19 4H9ZM12 9V17H22V9H12ZM16 11.5C16.83 11.5 17.5 12.17 17.5 13C17.5 13.83 16.83 14.5 16 14.5C15.17 14.5 14.5 13.83 14.5 13C14.5 12.17 15.17 11.5 16 11.5Z" fill="black" />
        </svg>
      </button>
    </div>
  );
}
