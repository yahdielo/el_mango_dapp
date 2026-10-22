import { MANGO_REFERRAL_ABI, ERC20_ABI } from '../config/abis';
import { ZERO_ADDRESS, getMangoReferralContractAddress } from './chainConfig';

const ROUTER_REFERRAL_ABI = [
  {
    inputs: [],
    name: 'mangoReferral',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const isZero = (a) => !a || String(a).toLowerCase() === ZERO_ADDRESS;

/**
 * Decide whether a referrer passed to router.swap() will actually be paid.
 *
 * The router's own `mangoReferral()` is authoritative: when it returns the zero address the
 * router pays no referral, whatever the referrer argument. Routers without that getter fall
 * back to the referral contract from chains.json. The referral contract must not be paused,
 * must whitelist the router and must hold MANGO to pay out.
 *
 * @param {{ publicClient: any, chainId: number, routerAddress: string }} params
 * @returns {Promise<{ active: boolean, reason: string, referralContract: string | null }>}
 */
export async function checkReferralPayout({ publicClient, chainId, routerAddress }) {
  if (!publicClient || !routerAddress) return { active: false, reason: 'no-router', referralContract: null };

  let referralContract = null;
  try {
    const fromRouter = await publicClient.readContract({
      address: routerAddress,
      abi: ROUTER_REFERRAL_ABI,
      functionName: 'mangoReferral',
    });
    if (isZero(fromRouter)) {
      return { active: false, reason: 'router-has-no-referral-contract', referralContract: null };
    }
    referralContract = fromRouter;
  } catch {
    referralContract = getMangoReferralContractAddress(chainId);
  }
  if (isZero(referralContract)) return { active: false, reason: 'no-referral-contract', referralContract: null };

  try {
    const [isPaused, isRouterWhitelisted, mangoTokenAddr] = await Promise.all([
      publicClient.readContract({ address: referralContract, abi: MANGO_REFERRAL_ABI, functionName: 'chainPaused', args: [BigInt(chainId)] }),
      publicClient.readContract({ address: referralContract, abi: MANGO_REFERRAL_ABI, functionName: 'whiteListed', args: [routerAddress] }),
      publicClient.readContract({ address: referralContract, abi: MANGO_REFERRAL_ABI, functionName: 'mangoToken' }),
    ]);
    if (isPaused) return { active: false, reason: 'referral-paused', referralContract };
    if (!isRouterWhitelisted) return { active: false, reason: 'router-not-whitelisted', referralContract };
    if (isZero(mangoTokenAddr)) return { active: false, reason: 'no-mango-token', referralContract };
    const balance = await publicClient.readContract({
      address: mangoTokenAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [referralContract],
    });
    if (balance == null || balance === 0n) return { active: false, reason: 'referral-unfunded', referralContract };
    return { active: true, reason: 'ok', referralContract };
  } catch {
    return { active: false, reason: 'check-failed', referralContract };
  }
}
