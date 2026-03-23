import { describe, it, expect } from 'vitest';
import { getTrustWalletLogoCandidates } from './tokenLogoUrl.js';

describe('getTrustWalletLogoCandidates', () => {
  it('includes checksummed Trust Wallet path for Base USDC (lowercase input)', () => {
    const urls = getTrustWalletLogoCandidates(
      8453,
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    );
    expect(
      urls.some((u) =>
        u.includes('/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png'),
      ),
    ).toBe(true);
  });

  it('uses arbitrum folder (not arbitrum_one) for chain 42161', () => {
    const urls = getTrustWalletLogoCandidates(
      42161,
      '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    );
    expect(urls.some((u) => u.includes('/arbitrum/assets/'))).toBe(true);
    expect(urls.some((u) => u.includes('/arbitrum_one/'))).toBe(false);
  });
});
