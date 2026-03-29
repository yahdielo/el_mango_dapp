import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-xs">
        {/* Logo mark */}
        <svg width="72" height="63" viewBox="0 0 57 50" fill="none">
          <defs>
            <linearGradient id="nfGrad" x1="28.426" y1="0" x2="28.426" y2="50.4526" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF306" />
              <stop offset="1" stopColor="#FF1212" />
            </linearGradient>
          </defs>
          <path
            d="M28.4258 0.5C43.9067 0.5 56.3516 11.6251 56.3516 25.2266C56.3514 38.8279 43.9066 49.9521 28.4258 49.9521C12.9451 49.9521 0.500169 38.8279 0.5 25.2266C0.5 11.6251 12.945 0.500092 28.4258 0.5Z"
            fill="#F1FCED"
            stroke="url(#nfGrad)"
          />
          <path
            d="M32.2863 14.9489V34.3617L38.9541 28.6521M25.6185 35.5037V16.0908L18.9507 21.8005"
            stroke="black"
            strokeWidth="3"
            strokeLinecap="square"
          />
        </svg>

        <div className="flex flex-col gap-1">
          <span className="text-[#3CF902] text-7xl font-bold leading-none">404</span>
          <span className="text-white text-lg font-medium">Page not found</span>
          <span className="text-[#A3A3A3] text-sm mt-1">
            This route doesn't exist. Head back to the swap.
          </span>
        </div>

        <button
          onClick={() => navigate('/', { replace: true })}
          className="mt-2 px-8 py-3 rounded-xl bg-[#3CF902] text-black font-semibold text-sm
                     hover:bg-[#2fd800] active:scale-95 transition-all"
        >
          Go to Swap
        </button>
      </div>
    </div>
  );
}
