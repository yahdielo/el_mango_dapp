import { useState } from 'react';

const PRESETS = [0.1, 0.5, 1];

export const SLIPPAGE_STORAGE_KEY = 'mango-slippage';

export function loadSlippageFromStorage(chainId, getSlippage) {
  try {
    const raw = localStorage.getItem(SLIPPAGE_STORAGE_KEY);
    if (raw) {
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) {
        const limits = getSlippage?.(chainId) ?? { min: 0.1, max: 5.0 };
        const val = Math.max(limits.min ?? 0.1, Math.min(limits.max ?? 5.0, parsed));
        return val;
      }
    }
  } catch (_) {}
  return null;
}

function saveToStorage(val) {
  try {
    localStorage.setItem(SLIPPAGE_STORAGE_KEY, String(val));
  } catch (_) {}
}

export default function SlippageSelector({
  value,
  onChange,
  chainId,
  getSlippage,
  className = '',
  disabled = false,
}) {
  const limits = getSlippage?.(chainId) ?? { min: 0.1, max: 5.0 };
  const min = limits.min ?? 0.1;
  const max = limits.max ?? 5.0;

  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);


  const handlePreset = (p) => {
    if (disabled) return;
    setIsCustom(false);
    setCustomInput('');
    const clamped = Math.max(min, Math.min(max, p));
    onChange?.(clamped);
    saveToStorage(clamped);
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    setCustomInput(value != null ? String(value) : '');
  };

  const handleCustomChange = (e) => {
    if (disabled) return;
    const v = e.target.value.replace(/[^0-9.]/g, '');
    setCustomInput(v);
    const num = parseFloat(v);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num));
      onChange?.(clamped);
      saveToStorage(clamped);
    } else if (v === '' || v === '.') {
      setCustomInput(v);
    }
  };

  const handleCustomBlur = () => {
    if (customInput === '' || parseFloat(customInput) === value) {
      setIsCustom(false);
      setCustomInput('');
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-gray-400 text-sm font-medium">Slippage</span>
      <div className="flex items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePreset(p)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !isCustom && value === p
                ? 'bg-[#3CF902] text-black'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-gray-700 hover:border-[#3CF902]/50'
            }`}
          >
            {p}%
          </button>
        ))}
        <div className="flex items-center">
          <input
            type="text"
            value={isCustom ? customInput : (value != null ? String(value) : '')}
            onFocus={handleCustomFocus}
            onChange={handleCustomChange}
            onBlur={handleCustomBlur}
            placeholder="Custom"
            disabled={disabled}
            readOnly={disabled}
            className={`w-16 px-2 py-1.5 rounded-lg text-sm bg-[#1a1a1a] text-white border border-gray-700 focus:border-[#3CF902] focus:outline-none placeholder:text-gray-500 ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          />
          <span className="ml-1 text-gray-500 text-sm">%</span>
        </div>
      </div>
    </div>
  );
}
