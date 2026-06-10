import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const TOS_KEY  = 'mangoswap_tos_accepted_v1';
const PASS_KEY = 'mangoswap_access_v1';
const FONT     = { fontFamily: "'Afacad', sans-serif" };

const ACCESS_GATE_ENABLED = import.meta.env.VITE_ACCESS_GATE_ENABLED === 'true';
const ACCESS_PHRASE = (import.meta.env.VITE_ACCESS_PASSPHRASE ?? 'MangoSwap2025').trim();

// ─── Root gate ────────────────────────────────────────────────────────────────
export default function TermsGate({ children }) {
  const [phase, setPhase]     = useState('loading');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const passOk = !ACCESS_GATE_ENABLED || sessionStorage.getItem(PASS_KEY) === 'true';
      const tosOk  = localStorage.getItem(TOS_KEY)   === 'true';
      if (!passOk)      setPhase('passphrase');
      else if (!tosOk)  setPhase('terms');
      else              setPhase('granted');
    } catch {
      setPhase(ACCESS_GATE_ENABLED ? 'passphrase' : 'terms');
    }
    setTimeout(() => setVisible(true), 60);
  }, []);

  const advanceTo = (next) => {
    setVisible(false);
    setTimeout(() => { setPhase(next); setVisible(true); }, 280);
  };

  if (phase === 'loading')  return null;
  if (phase === 'granted')  return children;

  return (
    <>
      {/* Full-screen dark backdrop */}
      <div className="fixed inset-0 z-40 bg-black" />

      {/* Overlay */}
      <div
        style={FONT}
        className={`fixed inset-0 z-50 flex items-center justify-center px-4
          transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {phase === 'passphrase' && (
          <PassphraseModal
            onSuccess={() => {
              try { sessionStorage.setItem(PASS_KEY, 'true'); } catch {}
              const tosOk = localStorage.getItem(TOS_KEY) === 'true';
              advanceTo(tosOk ? 'granted' : 'terms');
            }}
          />
        )}
        {phase === 'terms' && (
          <TermsModal
            onAccept={() => {
              try { localStorage.setItem(TOS_KEY, 'true'); } catch {}
              advanceTo('granted');
            }}
          />
        )}
      </div>

      {/* Blurred app content behind */}
      <div className="pointer-events-none select-none blur-sm">{children}</div>
    </>
  );
}

// ─── Passphrase modal ─────────────────────────────────────────────────────────
function PassphraseModal({ onSuccess }) {
  const [value, setValue]   = useState('');
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);
  const [show,  setShow]    = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === ACCESS_PHRASE.toLowerCase()) {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 600);
      setTimeout(() => setError(false), 3000);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className={`w-full max-w-[402px] bg-[#111111] rounded-2xl px-5 py-8 shadow-2xl border border-[#222]
        transition-all duration-300 ${shake ? 'animate-shake' : ''}`}
    >
      {/* Logo + heading */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/97964aed0ad7eead9b2235fd616501178f4c469a?width=164"
          alt="MangoSwap"
          className="w-[72px] h-[72px] object-contain mb-4"
        />
        <h1 className="text-white text-[32px] font-medium leading-tight">MangoSwap</h1>
        <p className="text-[#555555] text-[16px] font-medium mt-1 text-center">
          Private Access — Enter your passphrase
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {/* Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); if (error) setError(false); }}
            placeholder="Enter passphrase"
            autoComplete="off"
            className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-3.5 text-white text-base
              placeholder-[#555555] outline-none pr-11 transition-all
              focus:ring-2 focus:ring-[#3CF902] focus:border-transparent
              ${error ? 'border-red-500' : 'border-[#333]'}`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors"
          >
            {show ? <EyeOff /> : <EyeOn />}
          </button>
        </div>

        {/* Error */}
        <div className={`text-center text-sm transition-opacity duration-200 ${error ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-red-400">Incorrect passphrase. Please try again.</span>
        </div>

        {/* Enter button */}
        <button
          type="submit"
          disabled={!value.trim()}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all
            ${value.trim()
              ? 'bg-[#3CF902] text-[#111111] hover:brightness-110 active:scale-[0.98]'
              : 'bg-[#1a1a1a] text-[#444] border border-[#2a2a2a] cursor-not-allowed'}`}
        >
          Enter
        </button>
      </form>
    </div>
  );
}

// ─── Terms modal ──────────────────────────────────────────────────────────────
function TermsModal({ onAccept }) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const [checked,       setChecked]       = useState(false);

  const onScroll = (e) => {
    if (reachedBottom) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 64) {
      setReachedBottom(true);
    }
  };

  return (
    <div
      className="w-full max-w-[402px] bg-[#111111] rounded-2xl border border-[#222] shadow-2xl flex flex-col"
      style={{ height: '90vh', maxHeight: '740px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e1e1e] flex-shrink-0">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/97964aed0ad7eead9b2235fd616501178f4c469a?width=164"
          alt="MangoSwap"
          className="w-10 h-10 object-contain"
        />
        <div>
          <h2 className="text-white text-[20px] font-medium leading-tight">Terms of Service</h2>
          <p className="text-[#555555] text-sm">Scroll to the bottom, then accept to continue</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[#888] text-sm leading-relaxed"
        onScroll={onScroll}
        style={{ overscrollBehavior: 'contain' }}
      >
        <TClause title="1. Agreement to Terms">
          PLEASE READ THESE TERMS CAREFULLY. BY ACCESSING OR USING MANGOSWAP IN ANY WAY — INCLUDING CONNECTING A WALLET, INITIATING A SWAP, OR ANY OTHER INTERACTION WITH THE INTERFACE — YOU IRREVOCABLY AGREE TO THESE TERMS IN THEIR ENTIRETY. IF YOU DO NOT AGREE, YOU MUST IMMEDIATELY STOP USING THE PLATFORM.
        </TClause>

        <TClause title="2. No Responsibility for Transactions — Complete Disclaimer">
          <p className="text-red-400 font-semibold mb-2">
            MANGOSWAP HAS ZERO LIABILITY FOR ANY TRANSACTION EXECUTED ON OR THROUGH THE PLATFORM, INCLUDING:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-[#888]">
            <li>Loss of digital assets due to failed, delayed, stuck, or misdirected transactions;</li>
            <li>Loss due to incorrect recipient addresses, wrong chain selection, or any user error;</li>
            <li>Loss caused by smart contract bugs, exploits, hacks, re-entrancy attacks, or protocol failures;</li>
            <li>Slippage, price impact, or unfavourable exchange rates received;</li>
            <li>Gas fees paid for failed or unsuccessful transactions — all fees are non-refundable;</li>
            <li>Loss from market volatility between quote generation and transaction execution;</li>
            <li>Front-running, MEV attacks, sandwich attacks, or other adversarial on-chain activity;</li>
            <li>Oracle manipulation, flash loan attacks, or DeFi-specific exploits;</li>
            <li>Failure of any third-party bridge protocol (Symbiosis, LayerSwap, LiFi, Squid, Rango, Wormhole, THORChain, or any other);</li>
            <li>Liquidity shortfalls, impermanent loss, or pool imbalances;</li>
            <li>Regulatory, tax, or legal consequences in your jurisdiction;</li>
            <li>Wallet compromise, phishing attacks, private key theft, or malware;</li>
            <li>Network congestion, RPC failures, or blockchain downtime;</li>
            <li>Cross-chain transactions that fail to finalise on the destination chain;</li>
            <li>Funds locked in bridge contracts pending completion of a cross-chain transfer.</li>
          </ul>
          <p className="mt-3 font-semibold text-white">
            ALL BLOCKCHAIN TRANSACTIONS ARE FINAL AND IRREVERSIBLE. MANGOSWAP CANNOT REVERSE, CANCEL, OR REFUND ANY TRANSACTION ONCE SUBMITTED. YOU BEAR SOLE RESPONSIBILITY FOR ALL TRANSACTIONS.
          </p>
        </TClause>

        <TClause title="3. Restricted Jurisdictions">
          <p className="mb-3">Access and use of MangoSwap is strictly prohibited if you are a citizen of, resident in, or accessing from any of the following jurisdictions:</p>
          <div className="grid grid-cols-2 gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            {[
              ['🇺🇸','United States (USA)'],
              ['🇬🇧','United Kingdom (UK)'],
              ['🇨🇺','Cuba'],
              ['🇮🇷','Iran'],
              ['🇰🇵','North Korea'],
              ['🇸🇾','Syria'],
              ['🇷🇺','Russia'],
              ['🇧🇾','Belarus'],
              ['🇻🇪','Venezuela'],
              ['🇲🇲','Myanmar (Burma)'],
              ['🇨🇳','China'],
              ['🇭🇰','Hong Kong'],
              ['🇦🇫','Afghanistan'],
              ['🇪🇹','Ethiopia'],
              ['🇮🇶','Iraq'],
              ['🇱🇧','Lebanon'],
              ['🇱🇾','Libya'],
              ['🇲🇱','Mali'],
              ['🇳🇮','Nicaragua'],
              ['🇸🇴','Somalia'],
              ['🇸🇩','Sudan'],
              ['🇸🇸','South Sudan'],
              ['🇾🇪','Yemen'],
              ['🇿🇼','Zimbabwe'],
              ['🇺🇦','Ukraine (sanctioned regions)'],
            ].map(([f, n]) => (
              <div key={n} className="flex items-center gap-1.5 py-0.5 text-[13px]">
                <span>{f}</span>
                <span className="text-[#999]">{n}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-red-400 font-medium text-xs">
            Use of a VPN, proxy, or any other means to circumvent geographic restrictions is strictly prohibited and constitutes fraud.
          </p>
        </TClause>

        <TClause title="4. Eligibility">
          You must be at least 18 years of age and have full legal capacity to enter into a binding agreement. By using the Platform you represent that you meet these requirements.
        </TClause>

        <TClause title="5. Non-Custodial Protocol">
          MangoSwap is a non-custodial, decentralised exchange interface. We never take custody of your digital assets. All transactions are executed autonomously via public blockchain smart contracts. We are an interface only — not a broker, exchange, wallet custodian, or financial services provider.
        </TClause>

        <TClause title="6. High Risk — Digital Assets">
          <ul className="list-disc list-inside space-y-1.5">
            <li><span className="text-white font-medium">Smart Contract Risk:</span> Contracts may contain bugs or vulnerabilities resulting in total loss of funds.</li>
            <li><span className="text-white font-medium">Volatility Risk:</span> Digital asset prices are highly volatile. You may lose some or all value.</li>
            <li><span className="text-white font-medium">Key Management Risk:</span> Loss of your private key or seed phrase results in permanent, irrecoverable loss. MangoSwap cannot assist with recovery.</li>
            <li><span className="text-white font-medium">Regulatory Risk:</span> Laws governing digital assets are evolving and may adversely affect your assets or transactions.</li>
            <li><span className="text-white font-medium">Cross-Chain Risk:</span> Bridging involves additional risks including bridge contract failures and finalisation delays.</li>
            <li><span className="text-white font-medium">Tax Risk:</span> Swaps may constitute taxable events. You are solely responsible for all tax obligations.</li>
          </ul>
          <p className="mt-2 font-semibold text-white">DO NOT USE FUNDS YOU CANNOT AFFORD TO LOSE ENTIRELY.</p>
        </TClause>

        <TClause title="7. Fees">
          MangoSwap charges a protocol fee on swap and cross-chain transactions, disclosed prior to execution. By proceeding you consent to this fee. All fees — gas, bridge, and protocol — are non-refundable, including for failed transactions.
        </TClause>

        <TClause title="8. No Financial or Investment Advice">
          Nothing on the Platform constitutes financial, investment, legal, or tax advice. All information is provided for informational purposes only. Conduct your own research and consult qualified advisors before making any financial decisions.
        </TClause>

        <TClause title="9. AML & Sanctions Compliance">
          By using the Platform you represent that: (a) you are not on any government sanctions list; (b) your funds are not derived from unlawful activity; and (c) you are not using the Platform to evade taxes, sanctions, or legal obligations.
        </TClause>

        <TClause title="10. Prohibited Uses">
          You may not use the Platform to launder money, evade taxes, circumvent geographic restrictions, engage in market manipulation, introduce malware, scrape data without consent, or engage in any unlawful activity.
        </TClause>

        <TClause title="11. Third-Party Services">
          MangoSwap integrates with third-party bridge protocols, DEXs, oracles, and wallet providers. MangoSwap does not endorse or assume responsibility for any third-party service and shall not be liable for any loss arising from third-party service failures or exploits.
        </TClause>

        <TClause title="12. Limitation of Liability">
          <p className="text-red-400 font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MANGOSWAP'S TOTAL AGGREGATE LIABILITY TO YOU IS ZERO (USD $0.00). MANGOSWAP IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES OF ANY KIND.
          </p>
        </TClause>

        <TClause title="13. Disclaimer of Warranties">
          THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. MANGOSWAP DISCLAIMS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </TClause>

        <TClause title="14. Indemnification">
          You agree to defend, indemnify, and hold harmless MangoSwap and its affiliates from all claims, liabilities, damages, and expenses (including legal fees) arising from your use of the Platform, violation of these Terms, or violation of any law or third-party rights.
        </TClause>

        <TClause title="15. Governing Law & Dispute Resolution">
          These Terms are governed by applicable law. All disputes shall be resolved by binding arbitration. You waive any right to a jury trial or class action participation.
        </TClause>

        <TClause title="16. Termination">
          MangoSwap may terminate or restrict your access at any time, without notice, for any reason including suspected fraud, sanctions violations, or any breach of these Terms.
        </TClause>

        <TClause title="17. Changes to Terms">
          MangoSwap may modify these Terms at any time without notice. Continued use of the Platform constitutes acceptance of the revised Terms.
        </TClause>

        {/* Bottom anchor */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <Link
            to="/terms"
            target="_blank"
            className="text-[#3CF902] text-xs hover:underline focus:outline-none"
          >
            View full Terms of Service →
          </Link>
        </div>

        {/* Scroll indicator — fades out once reached */}
        <div
          className={`flex flex-col items-center gap-1 py-2 text-[#444] text-xs transition-opacity duration-500
            ${reachedBottom ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          Scroll down to continue
        </div>
      </div>

      {/* Footer — slides in after scrolling */}
      <div
        className={`border-t border-[#1e1e1e] px-6 flex-shrink-0 overflow-hidden
          transition-all duration-500 ease-out
          ${reachedBottom
            ? 'max-h-48 pt-4 pb-5 opacity-100'
            : 'max-h-0 pt-0 pb-0 opacity-0 pointer-events-none'}`}
        style={{ paddingLeft: '20px', paddingRight: '20px' }}
      >
        {/* Checkbox row */}
        <label className="flex items-start gap-3 cursor-pointer group mb-3">
          <button
            type="button"
            onClick={() => setChecked(c => !c)}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center
              transition-all focus:outline-none
              ${checked
                ? 'bg-[#3CF902] border-[#3CF902]'
                : 'border-[#444] bg-transparent group-hover:border-[#3CF902]/60'}`}
          >
            {checked && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4.5L4 7.5L10 1" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span className="text-[#888] text-xs leading-relaxed">
            I confirm I am <span className="text-white font-medium">not</span> a resident, citizen, or national of any Restricted Jurisdiction.
            I have read and agree to the{' '}
            <Link to="/terms" target="_blank" className="text-[#3CF902] hover:underline">Terms of Service</Link>.
            I understand I bear full responsibility for all transactions and may lose all funds.
          </span>
        </label>

        {/* Accept button */}
        <button
          onClick={onAccept}
          disabled={!checked}
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all
            ${checked
              ? 'bg-[#3CF902] text-[#111111] hover:brightness-110 active:scale-[0.98]'
              : 'bg-[#1a1a1a] text-[#444] border border-[#2a2a2a] cursor-not-allowed'}`}
        >
          {checked ? 'I Agree — Enter MangoSwap' : 'Check the box above to continue'}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TClause({ title, children }) {
  return (
    <div>
      <p className="text-white font-medium mb-1.5 flex items-center gap-2">
        <span className="inline-block w-0.5 h-4 rounded-full bg-[#3CF902] flex-shrink-0" />
        {title}
      </p>
      <div className="pl-3">
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
    </div>
  );
}

function EyeOn() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
    </svg>
  );
}
