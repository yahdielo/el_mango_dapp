import { describe, it, expect } from 'vitest';
import { checkReferralPayout } from './referralPayout.js';

const ROUTER = '0x43De398c1b472A4452A29A44be60A988D709485C';
const REFERRAL = '0x1dC5726C54791c18eA68C26428bef5c278007627';
const MANGO = '0x8E161c59F22D41c466aAA7209A16E1Ea2773e383';
const ZERO = '0x0000000000000000000000000000000000000000';

/** Fake viem public client: `answers[functionName]` is a value or an Error to throw. */
function client(answers) {
  return {
    async readContract({ functionName }) {
      const a = answers[functionName];
      if (a instanceof Error) throw a;
      return a;
    },
  };
}

const healthy = { mangoReferral: REFERRAL, chainPaused: false, whiteListed: true, mangoToken: MANGO, balanceOf: 10n ** 18n };

describe('checkReferralPayout', () => {
  it('is active when the router points at a funded, unpaused referral contract that whitelists it', async () => {
    const r = await checkReferralPayout({ publicClient: client(healthy), chainId: 8453, routerAddress: ROUTER });
    expect(r).toEqual({ active: true, reason: 'ok', referralContract: REFERRAL });
  });

  it('is inactive when the router has no referral contract (mangoReferral = 0x0) — the live Base router', async () => {
    const r = await checkReferralPayout({ publicClient: client({ ...healthy, mangoReferral: ZERO }), chainId: 8453, routerAddress: ROUTER });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('router-has-no-referral-contract');
  });

  it('falls back to chains.json when the router has no mangoReferral getter', async () => {
    const r = await checkReferralPayout({ publicClient: client({ ...healthy, mangoReferral: new Error('revert') }), chainId: 8453, routerAddress: ROUTER });
    expect(r.active).toBe(true);
    expect(r.referralContract.toLowerCase()).toBe(REFERRAL.toLowerCase());
  });

  it.each([
    ['referral-paused', { chainPaused: true }],
    ['router-not-whitelisted', { whiteListed: false }],
    ['no-mango-token', { mangoToken: ZERO }],
    ['referral-unfunded', { balanceOf: 0n }],
    ['check-failed', { whiteListed: new Error('no such function') }],
  ])('is inactive with reason %s', async (reason, override) => {
    const r = await checkReferralPayout({ publicClient: client({ ...healthy, ...override }), chainId: 8453, routerAddress: ROUTER });
    expect(r).toMatchObject({ active: false, reason });
  });

  it('is inactive without a router', async () => {
    const r = await checkReferralPayout({ publicClient: client(healthy), chainId: 8453, routerAddress: null });
    expect(r.active).toBe(false);
  });
});
