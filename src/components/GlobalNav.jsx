import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';

const NAV_ITEMS = [
  { to: '/',            label: 'Swap',         icon: '⇄' },
  { to: '/cross-chain', label: 'Bridge',        icon: '🌉' },
  { to: '/history',     label: 'History',       icon: '🕐' },
  { to: '/referral',    label: 'Referral',      icon: '🎯' },
];

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { address } = useAccount();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t border-white/10 flex md:hidden">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 min-h-[56px]
              ${isActive(to) ? 'text-[#3CF902]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
        {/* More menu */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 min-h-[56px] text-gray-500 hover:text-gray-300"
        >
          <span className="text-lg leading-none">☰</span>
          <span>More</span>
        </button>
      </nav>

      {/* ── Slide-up "more" sheet ─────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#111] border-t border-white/10 rounded-t-2xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <div className="flex flex-col gap-1">
              {address && (
                <div className="text-gray-500 text-xs font-mono mb-3 px-1">
                  {address.slice(0, 8)}…{address.slice(-6)}
                </div>
              )}
              {[
                { to: '/referral',  label: 'Referral Program', icon: '🎯' },
                { to: '/history',   label: 'Swap History',      icon: '🕐' },
                { to: '/agent',     label: 'Developer / Agent', icon: '⚙️' },
                { to: '/terms',     label: 'Terms of Service',  icon: '📄' },
              ].map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white"
                >
                  <span className="text-xl w-7 text-center">{icon}</span>
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
