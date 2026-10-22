import { describe, it, expect } from 'vitest';
import { estimateAmountOutToHuman } from './estimateAmount.js';

describe('estimateAmountOutToHuman', () => {
  it('keeps LayerSwap whole-number amounts as-is (10 USDC stays 10)', () => {
    expect(estimateAmountOutToHuman('10', 'layerswap', 6)).toBe('10');
  });

  it('keeps THORChain amounts as-is', () => {
    expect(estimateAmountOutToHuman('1', 'thorchain', 8)).toBe('1');
  });

  it('keeps any decimal value as-is', () => {
    expect(estimateAmountOutToHuman('0.01', 'rango', 18)).toBe('0.01');
  });

  it('converts Rango smallest units', () => {
    expect(estimateAmountOutToHuman('10000000', 'rango', 6)).toBe('10');
    expect(estimateAmountOutToHuman('9970000', 'rango', 6)).toBe('9.97');
  });

  it('converts LiFi smallest units', () => {
    expect(estimateAmountOutToHuman('1500000000000000000', 'lifi', 18)).toBe('1.5');
  });

  it('treats an unknown provider as smallest units (previous behaviour)', () => {
    expect(estimateAmountOutToHuman('2500000', undefined, 6)).toBe('2.5');
  });

  it('returns null for empty input', () => {
    expect(estimateAmountOutToHuman(null, 'layerswap', 6)).toBeNull();
    expect(estimateAmountOutToHuman('', 'rango', 6)).toBeNull();
  });
});
