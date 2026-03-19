/**
 * Tests for chain config: router and referrer must be set for all supported swap chains
 * so that regular (same-chain) swap and referral work on every chain.
 */
import { describe, it, expect } from 'vitest';
import {
  getRouterAddress,
  getReferrerAddress,
  ZERO_ADDRESS,
} from './chainConfig';
import { SUPPORTED_SWAP_CHAINS } from '../config/tokenLists';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

describe('chainConfig (regular swap + referral)', () => {
  describe('getRouterAddress', () => {
    it('returns a valid 0x address for every supported swap chain', () => {
      for (const chainId of SUPPORTED_SWAP_CHAINS) {
        const router = getRouterAddress(chainId);
        expect(router, `chainId ${chainId} should have router`).not.toBeNull();
        expect(router, `chainId ${chainId} router should be 0x address`).toMatch(
          ETH_ADDRESS_REGEX
        );
      }
    });
  });

  describe('getReferrerAddress', () => {
    it('returns a valid 0x address or ZERO_ADDRESS for every supported swap chain', () => {
      for (const chainId of SUPPORTED_SWAP_CHAINS) {
        const referrer = getReferrerAddress(chainId);
        expect(
          referrer,
          `chainId ${chainId} should have referrer (or ZERO_ADDRESS)`
        ).not.toBeNull();
        // Default is ZERO_ADDRESS unless VITE_REFERRER_ADDRESS is explicitly set in the test environment.
        if (referrer !== ZERO_ADDRESS) {
          expect(referrer, `chainId ${chainId} referrer should be 0x address`).toMatch(ETH_ADDRESS_REGEX);
        }
      }
    });

    it('returns ZERO_ADDRESS for unknown chain when no env override', () => {
      const referrer = getReferrerAddress(99999);
      expect(referrer).toBe(ZERO_ADDRESS);
    });
  });

  describe('supported chains list', () => {
    it('includes expected chain IDs (Base, Arbitrum, BSC, Polygon, Optimism, Avalanche, Ethereum)', () => {
      expect(SUPPORTED_SWAP_CHAINS).toContain(1);
      expect(SUPPORTED_SWAP_CHAINS).toContain(10);
      expect(SUPPORTED_SWAP_CHAINS).toContain(56);
      expect(SUPPORTED_SWAP_CHAINS).toContain(137);
      expect(SUPPORTED_SWAP_CHAINS).toContain(42161);
      expect(SUPPORTED_SWAP_CHAINS).toContain(43114);
      expect(SUPPORTED_SWAP_CHAINS).toContain(8453);
      expect(SUPPORTED_SWAP_CHAINS).toHaveLength(7);
    });
  });
});
