import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidReferrerAddress,
  getStoredReferrer,
  setStoredReferrer,
  resolveEffectiveReferrer,
} from './referrerStorage';
import { ZERO_ADDRESS } from './chainConfig';

const USER = '0x1111111111111111111111111111111111111111';
const REF = '0x2222222222222222222222222222222222222222';

describe('referrerStorage', () => {
  beforeEach(() => {
    // Vitest runs in node env (no window). Provide a minimal stub.
    globalThis.window = globalThis.window || {};
    const store = new Map();
    globalThis.window.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window.localStorage.clear();
  });

  it('validates referrer address format', () => {
    expect(isValidReferrerAddress(REF)).toBe(true);
    expect(isValidReferrerAddress('0x123')).toBe(false);
    expect(isValidReferrerAddress('')).toBe(false);
  });

  it('stores and reads per-user referrer', () => {
    expect(getStoredReferrer(USER)).toBe(ZERO_ADDRESS);
    setStoredReferrer(USER, REF);
    expect(getStoredReferrer(USER)).toBe(REF);
  });

  it('rejects storing self-referral', () => {
    setStoredReferrer(USER, USER);
    expect(getStoredReferrer(USER)).toBe(ZERO_ADDRESS);
  });

  it('URL ref takes precedence over stored', () => {
    setStoredReferrer(USER, REF);
    const urlRef = '0x3333333333333333333333333333333333333333';
    const eff = resolveEffectiveReferrer({ userAddress: USER, chainId: 8453, urlRef });
    expect(eff).toBe(urlRef);
  });
});

