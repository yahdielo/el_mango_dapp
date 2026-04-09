import { Link } from 'react-router-dom';

export default function SwapFooter() {
  return (
    <div className="flex flex-col items-center mt-[10px]">
      <div className="flex gap-4 mb-2">
        <Link to="/whitelist-admin" className="text-[#A3A3A3] text-xs hover:text-[#3CF902]">
          Whitelist admin
        </Link>
        <span className="text-[#A3A3A3] text-xs">·</span>
        <Link to="/terms" className="text-[#A3A3A3] text-xs hover:text-[#3CF902]">
          Terms of Service
        </Link>
      </div>
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/97964aed0ad7eead9b2235fd616501178f4c469a?width=164"
        alt="MangoSwap"
        className="w-[82px] h-[82px] object-contain"
      />
      <p className="text-[#A3A3A3] text-[16px] font-medium -mt-3">Powered By Base</p>

      <div className="flex justify-center mt-5">
        <div className="flex flex-col items-center gap-[2px]">
          <svg width="57" height="50" viewBox="0 0 57 50" fill="none">
            <defs>
              <linearGradient id="navGrad" x1="28.426" y1="0" x2="28.426" y2="50.4526" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF306" />
                <stop offset="1" stopColor="#FF1212" />
              </linearGradient>
            </defs>
            <path
              d="M28.4258 0.5C43.9067 0.5 56.3516 11.6251 56.3516 25.2266C56.3514 38.8279 43.9066 49.9521 28.4258 49.9521C12.9451 49.9521 0.500169 38.8279 0.5 25.2266C0.5 11.6251 12.945 0.500092 28.4258 0.5Z"
              fill="#F1FCED"
              stroke="url(#navGrad)"
            />
            <path d="M32.2863 14.9489V34.3617L38.9541 28.6521M25.6185 35.5037V16.0908L18.9507 21.8005" stroke="black" strokeWidth="3" strokeLinecap="square" />
          </svg>
          <span className="text-white text-[20px] font-medium">Swap</span>
        </div>
      </div>
    </div>
  );
}
