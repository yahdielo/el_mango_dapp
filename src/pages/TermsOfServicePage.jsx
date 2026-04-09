export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#111111] text-gray-300 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/97964aed0ad7eead9b2235fd616501178f4c469a?width=164"
            alt="MangoSwap"
            className="w-16 h-16 object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-1">MangoSwap</h1>
          <h2 className="text-xl font-semibold text-[#3CF902] mb-2">Terms of Service &amp; User Agreement</h2>
          <p className="text-xs text-gray-500">Last updated: April 9, 2026 &nbsp;|&nbsp; Effective immediately upon access</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          {/* 1 */}
          <Section title="1. Agreement to Terms">
            <p>
              PLEASE READ THESE TERMS OF SERVICE ("TERMS," "AGREEMENT") CAREFULLY BEFORE ACCESSING OR USING THE MANGOSWAP PROTOCOL, INTERFACE, SMART CONTRACTS, OR ANY ASSOCIATED SERVICES (COLLECTIVELY, THE "PLATFORM"). BY ACCESSING OR USING THE PLATFORM IN ANY MANNER, INCLUDING BUT NOT LIMITED TO CONNECTING A WALLET, INITIATING A TOKEN SWAP, CROSS-CHAIN BRIDGE TRANSACTION, OR ANY OTHER INTERACTION WITH THE INTERFACE, YOU IRREVOCABLY AGREE TO BE BOUND BY THESE TERMS IN THEIR ENTIRETY.
            </p>
            <p className="mt-3">
              IF YOU DO NOT AGREE TO EVERY PROVISION OF THESE TERMS, YOU MUST IMMEDIATELY CEASE ALL ACCESS TO AND USE OF THE PLATFORM. YOUR CONTINUED USE OF THE PLATFORM CONSTITUTES YOUR ONGOING ACCEPTANCE OF THESE TERMS, AS AMENDED FROM TIME TO TIME WITHOUT PRIOR NOTICE.
            </p>
            <p className="mt-3">
              These Terms constitute a legally binding agreement between you ("User," "you," or "your") and MangoSwap ("MangoSwap," "we," "us," or "our"). MangoSwap reserves the right to modify, amend, or replace these Terms at any time, at its sole discretion, with or without notice. It is your responsibility to review these Terms periodically. Your continued use after any modification constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Eligibility and Access Restrictions">
            <p>
              The Platform is intended solely for use by individuals who are at least eighteen (18) years of age and who have full legal capacity to enter into a binding contract under the laws applicable to them. By using the Platform, you represent and warrant that you meet these requirements.
            </p>
            <p className="mt-3 font-semibold text-white">
              2.1 Prohibited Jurisdictions — Absolute Geographic Restrictions
            </p>
            <p className="mt-2">
              THE PLATFORM IS STRICTLY PROHIBITED FROM USE BY ANY PERSON OR ENTITY THAT IS A CITIZEN OF, RESIDENT IN, LOCATED IN, OR INCORPORATED OR REGISTERED UNDER THE LAWS OF ANY OF THE FOLLOWING JURISDICTIONS (COLLECTIVELY, "RESTRICTED JURISDICTIONS"). ACCESS FROM THESE JURISDICTIONS IS EXPRESSLY FORBIDDEN AND CONSTITUTES A MATERIAL BREACH OF THESE TERMS:
            </p>
            <ul className="mt-3 space-y-1 list-none">
              {[
                ['🇺🇸', 'United States of America (USA)', 'including all territories and possessions'],
                ['🇬🇧', 'United Kingdom (UK)', 'including England, Scotland, Wales, and Northern Ireland'],
                ['🇨🇺', 'Cuba', 'OFAC-sanctioned jurisdiction'],
                ['🇮🇷', 'Iran (Islamic Republic of Iran)', 'OFAC-sanctioned jurisdiction'],
                ['🇰🇵', 'North Korea (Democratic People\'s Republic of Korea)', 'OFAC-sanctioned jurisdiction'],
                ['🇸🇾', 'Syria (Syrian Arab Republic)', 'OFAC-sanctioned jurisdiction'],
                ['🇷🇺', 'Russia (Russian Federation)', 'sanctioned jurisdiction'],
                ['🇧🇾', 'Belarus (Republic of Belarus)', 'sanctioned jurisdiction'],
                ['🇻🇪', 'Venezuela (Bolivarian Republic of Venezuela)', 'sanctioned jurisdiction'],
                ['🇲🇲', 'Myanmar (Burma)', 'FATF high-risk jurisdiction'],
                ['🇨🇳', 'China (People\'s Republic of China)', 'including mainland China'],
                ['🇭🇰', 'Hong Kong (Special Administrative Region)', 'related to PRC restrictions'],
                ['🇦🇫', 'Afghanistan', 'FATF high-risk / sanctions'],
                ['🇪🇹', 'Ethiopia', 'FATF grey-listed jurisdiction'],
                ['🇮🇶', 'Iraq', 'FATF high-risk jurisdiction'],
                ['🇱🇧', 'Lebanon', 'FATF grey-listed jurisdiction'],
                ['🇱🇾', 'Libya', 'UN-sanctioned jurisdiction'],
                ['🇲🇱', 'Mali', 'FATF grey-listed jurisdiction'],
                ['🇳🇮', 'Nicaragua', 'sanctioned jurisdiction'],
                ['🇸🇴', 'Somalia', 'FATF high-risk jurisdiction'],
                ['🇸🇩', 'Sudan', 'OFAC-sanctioned jurisdiction'],
                ['🇸🇸', 'South Sudan', 'sanctioned jurisdiction'],
                ['🇾🇪', 'Yemen', 'UN-sanctioned jurisdiction'],
                ['🇿🇼', 'Zimbabwe', 'OFAC-sanctioned jurisdiction'],
                ['🇺🇦', 'Ukraine (certain regions)', 'including Crimea, Donetsk, Luhansk — sanctioned regions'],
              ].map(([flag, country, reason]) => (
                <li key={country} className="flex gap-2 bg-[#1a1a1a] rounded px-3 py-1.5">
                  <span className="text-base">{flag}</span>
                  <span><span className="text-white font-medium">{country}</span> <span className="text-gray-500 text-xs">— {reason}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              By using this Platform, you represent and warrant that you are not located in, a resident of, a citizen of, or acting on behalf of any person or entity in any Restricted Jurisdiction. Any use of VPN, proxy, or other technological means to circumvent these geographic restrictions is strictly prohibited and constitutes fraud. MangoSwap reserves the right to immediately terminate your access and, where applicable, report such activity to the relevant authorities.
            </p>
          </Section>

          {/* 3 */}
          <Section title="3. Nature of the Platform — Non-Custodial Protocol">
            <p>
              MangoSwap is a non-custodial, decentralised token exchange and cross-chain bridging interface. The Platform does not at any time take custody, possession, control, or ownership of your digital assets. All transactions are executed directly on public blockchain networks via smart contracts that operate autonomously and without the ability of MangoSwap to intervene, reverse, pause, or modify them once submitted.
            </p>
            <p className="mt-3">
              MangoSwap is an interface only. We do not provide brokerage, exchange, wallet custodianship, investment management, financial advice, or any similar regulated service. We do not match buyers with sellers, nor do we take the other side of any transaction. Swaps and cross-chain bridges are routed through third-party liquidity providers, bridge protocols, and automated market makers ("AMMs") that operate independently of MangoSwap.
            </p>
          </Section>

          {/* 4 */}
          <Section title="4. No Responsibility for Transactions — Complete Disclaimer">
            <p className="text-[#FF4444] font-semibold">
              MANGOSWAP IS NOT RESPONSIBLE, AND SHALL HAVE NO LIABILITY WHATSOEVER, FOR ANY TRANSACTION EXECUTED ON OR THROUGH THE PLATFORM, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
              <li>Any loss of digital assets due to failed, reversed, delayed, stuck, or misdirected transactions;</li>
              <li>Any loss arising from incorrect recipient addresses, wrong chain selection, or user error of any kind;</li>
              <li>Any loss caused by smart contract bugs, exploits, hacks, re-entrancy attacks, or protocol failures in any third-party bridge or DEX protocol used;</li>
              <li>Any slippage, price impact, or unfavourable exchange rates received;</li>
              <li>Any gas fees paid that result in a failed or unsuccessful transaction;</li>
              <li>Any loss caused by market volatility, including sudden price movements that occur between quote generation and transaction execution;</li>
              <li>Any loss arising from front-running, MEV (Maximal Extractable Value) attacks, sandwich attacks, or other adversarial on-chain activity;</li>
              <li>Any loss arising from oracle manipulation, flash loan attacks, or other DeFi-specific exploits;</li>
              <li>Any failure of a third-party bridge protocol, including but not limited to Symbiosis, LayerSwap, LiFi, Squid, Rango, Wormhole, THORChain, or any other integrated bridge;</li>
              <li>Any loss arising from liquidity shortfalls, impermanent loss, or pool imbalances;</li>
              <li>Any regulatory, tax, or legal consequences arising from your use of the Platform in your jurisdiction;</li>
              <li>Any loss arising from your wallet being compromised, including phishing attacks, private key theft, or malware;</li>
              <li>Any network congestion, RPC failures, or blockchain downtime that causes delays or failures;</li>
              <li>Any error in the information displayed on the interface, including price feeds, balance displays, or route calculations;</li>
              <li>Any interaction with fraudulent or scam tokens, rug pulls, or honeypot contracts;</li>
              <li>Any cross-chain transaction that fails to finalise on the destination chain for any reason;</li>
              <li>Any loss of funds locked in bridge contracts pending completion of a cross-chain transfer.</li>
            </ul>
            <p className="mt-4">
              ALL TRANSACTIONS ON BLOCKCHAIN NETWORKS ARE FINAL AND IRREVERSIBLE. MANGOSWAP HAS NO TECHNICAL ABILITY TO REVERSE, CANCEL, OR REFUND ANY TRANSACTION ONCE SUBMITTED TO A BLOCKCHAIN NETWORK. YOU BEAR SOLE AND EXCLUSIVE RESPONSIBILITY FOR ALL TRANSACTIONS YOU INITIATE THROUGH THE PLATFORM.
            </p>
          </Section>

          {/* 5 */}
          <Section title="5. Risks of Decentralised Finance (DeFi)">
            <p>You expressly acknowledge and accept the following risks inherent to decentralised finance and blockchain technology:</p>
            <ul className="mt-3 list-disc list-inside space-y-2">
              <li><span className="text-white font-medium">Smart Contract Risk:</span> Smart contracts may contain bugs, vulnerabilities, or logic errors that could result in total loss of funds. Code audits do not guarantee security.</li>
              <li><span className="text-white font-medium">Regulatory Risk:</span> The regulatory status of digital assets and DeFi protocols is uncertain and evolving. Future regulations may adversely affect the value or legality of your holdings or transactions.</li>
              <li><span className="text-white font-medium">Liquidity Risk:</span> Insufficient liquidity in trading pools may result in inability to execute trades or in significant price slippage.</li>
              <li><span className="text-white font-medium">Volatility Risk:</span> Digital asset prices are highly volatile. You may lose some or all of the value of your assets.</li>
              <li><span className="text-white font-medium">Technology Risk:</span> Blockchain networks, wallets, and related infrastructure may experience bugs, downtime, or forks that adversely affect your assets.</li>
              <li><span className="text-white font-medium">Counterparty Risk:</span> Third-party protocols, bridges, and liquidity providers may be exploited, hacked, or may cease operations.</li>
              <li><span className="text-white font-medium">Key Management Risk:</span> Loss of your private key or seed phrase results in permanent, irrecoverable loss of access to your digital assets. MangoSwap cannot assist with key recovery.</li>
              <li><span className="text-white font-medium">Network Risk:</span> High gas prices, network congestion, or blockchain reorganisations may affect transaction execution.</li>
              <li><span className="text-white font-medium">Cross-Chain Risk:</span> Cross-chain bridging involves additional layers of risk including bridge contract failures, validator collusion, and finalisation delays.</li>
              <li><span className="text-white font-medium">Tax Risk:</span> Swaps and bridge transactions may constitute taxable events in your jurisdiction. You are solely responsible for all applicable tax obligations.</li>
            </ul>
            <p className="mt-4">
              YOU SHOULD NOT USE THE PLATFORM WITH FUNDS YOU CANNOT AFFORD TO LOSE ENTIRELY. DIGITAL ASSET INVESTMENTS CARRY A HIGH RISK OF LOSS.
            </p>
          </Section>

          {/* 6 */}
          <Section title="6. Fees">
            <p>
              MangoSwap charges a protocol fee on swap and cross-chain bridge transactions. This fee is transparently disclosed in the transaction details prior to execution. By proceeding with any transaction, you consent to the deduction of the applicable protocol fee.
            </p>
            <p className="mt-3">
              In addition to MangoSwap protocol fees, you will incur network gas fees, bridge fees, and third-party liquidity provider fees. These are not charged by MangoSwap and MangoSwap has no control over them. All fees are non-refundable, including fees paid for transactions that fail.
            </p>
          </Section>

          {/* 7 */}
          <Section title="7. No Financial or Investment Advice">
            <p>
              Nothing on the Platform constitutes financial advice, investment advice, trading advice, legal advice, tax advice, or any other form of professional advice. MangoSwap is a technology interface only. All information provided on the Platform, including token prices, swap routes, estimated outputs, and any other data, is provided for informational purposes only and should not be relied upon as the basis for any financial decision.
            </p>
            <p className="mt-3">
              You should conduct your own independent research and, where appropriate, consult with qualified financial, legal, and tax advisors before making any decision to use the Platform or transact in digital assets. MangoSwap expressly disclaims any responsibility for any investment decision made in reliance on information displayed on the Platform.
            </p>
          </Section>

          {/* 8 */}
          <Section title="8. Intellectual Property">
            <p>
              All content, trademarks, logos, user interface designs, source code, and other intellectual property displayed on the Platform are the property of MangoSwap or its licensors and are protected by applicable intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Platform or its content without express written permission from MangoSwap.
            </p>
          </Section>

          {/* 9 */}
          <Section title="9. Prohibited Uses">
            <p>You agree that you will not use the Platform to:</p>
            <ul className="mt-3 list-disc list-inside space-y-1">
              <li>Violate any applicable law, regulation, or rule, including without limitation anti-money laundering (AML), counter-terrorism financing (CTF), and sanctions laws;</li>
              <li>Launder money, evade taxes, or engage in any other financial crimes;</li>
              <li>Circumvent geographic restrictions using VPNs, proxies, or other technical means;</li>
              <li>Engage in market manipulation, wash trading, front-running, or any other deceptive market practice;</li>
              <li>Introduce malware, viruses, or other malicious code into the Platform;</li>
              <li>Scrape, crawl, or extract data from the Platform without prior written consent;</li>
              <li>Interfere with or disrupt the integrity or performance of the Platform or its infrastructure;</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity;</li>
              <li>Use the Platform to process proceeds of crime or to fund terrorism in any form;</li>
              <li>Engage in any activity that could impose an unreasonable or disproportionate load on the Platform's infrastructure.</li>
            </ul>
          </Section>

          {/* 10 */}
          <Section title="10. Anti-Money Laundering (AML) and Know Your Customer (KYC)">
            <p>
              MangoSwap is committed to complying with applicable anti-money laundering and counter-terrorist financing laws and regulations. While the Platform is non-custodial and does not currently require identity verification, MangoSwap reserves the absolute right to implement KYC/AML procedures at any time, without notice, where required or advisable under applicable law.
            </p>
            <p className="mt-3">
              By using the Platform, you represent and warrant that: (a) you are not on any government sanctions list, including without limitation the OFAC Specially Designated Nationals list, the EU consolidated list of sanctioned persons, or the UN Security Council consolidated list; (b) the funds you use through the Platform are not derived from any unlawful activity; and (c) you are not using the Platform to evade taxes, sanctions, or other legal obligations.
            </p>
          </Section>

          {/* 11 */}
          <Section title="11. Third-Party Services and Links">
            <p>
              The Platform integrates and interacts with numerous third-party protocols, services, and networks, including but not limited to decentralised exchanges, cross-chain bridge protocols, oracle providers, wallet providers, and blockchain networks (collectively, "Third-Party Services"). MangoSwap does not endorse, warrant, or assume any responsibility for Third-Party Services.
            </p>
            <p className="mt-3">
              Your use of Third-Party Services is governed by the respective terms and conditions of those services. MangoSwap shall not be liable for any loss, damage, or harm arising from your interaction with any Third-Party Service. You acknowledge that Third-Party Services may be subject to separate terms, fees, and risks.
            </p>
          </Section>

          {/* 12 */}
          <Section title="12. Limitation of Liability">
            <p className="text-[#FF4444] font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL MANGOSWAP, ITS AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR:
            </p>
            <ul className="mt-3 list-disc list-inside space-y-2">
              <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES;</li>
              <li>ANY LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL, DATA, OR DIGITAL ASSETS;</li>
              <li>ANY LOSS ARISING FROM SMART CONTRACT VULNERABILITIES, HACKS, EXPLOITS, OR PROTOCOL FAILURES;</li>
              <li>ANY LOSS ARISING FROM THIRD-PARTY BRIDGE OR DEX PROTOCOL FAILURES;</li>
              <li>ANY DAMAGES ARISING FROM YOUR INABILITY TO ACCESS OR USE THE PLATFORM;</li>
              <li>ANY DAMAGES ARISING FROM UNAUTHORISED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS OR DATA;</li>
              <li>ANY OTHER MATTER RELATING TO THE PLATFORM, REGARDLESS OF THE CAUSE OF ACTION OR THE THEORY OF LIABILITY, EVEN IF MANGOSWAP HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</li>
            </ul>
            <p className="mt-4">
              IN JURISDICTIONS THAT DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CONSEQUENTIAL OR INCIDENTAL DAMAGES, MANGOSWAP'S LIABILITY SHALL BE LIMITED TO THE GREATEST EXTENT PERMITTED BY LAW. IN ALL CASES, MANGOSWAP'S MAXIMUM AGGREGATE LIABILITY TO YOU SHALL NOT EXCEED ZERO DOLLARS (USD $0.00), AS THE PLATFORM IS PROVIDED FREE OF CHARGE AS AN INTERFACE ONLY.
            </p>
          </Section>

          {/* 13 */}
          <Section title="13. Disclaimer of Warranties">
            <p>
              THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. MANGOSWAP EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING WITHOUT LIMITATION:
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1">
              <li>WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT;</li>
              <li>WARRANTIES THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE;</li>
              <li>WARRANTIES THAT DEFECTS WILL BE CORRECTED;</li>
              <li>WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, OR TIMELINESS OF ANY INFORMATION ON THE PLATFORM;</li>
              <li>WARRANTIES THAT THE PLATFORM IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS;</li>
              <li>WARRANTIES REGARDING THE RESULTS THAT MAY BE OBTAINED FROM USE OF THE PLATFORM.</li>
            </ul>
          </Section>

          {/* 14 */}
          <Section title="14. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless MangoSwap and its affiliates, officers, directors, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to: (a) your use of or access to the Platform; (b) your violation of these Terms; (c) your violation of any applicable law, regulation, or rule; (d) your violation of any third-party rights; or (e) any transaction you initiate through the Platform.
            </p>
          </Section>

          {/* 15 */}
          <Section title="15. Privacy">
            <p>
              MangoSwap does not collect personally identifiable information from users. However, certain data, including wallet addresses, transaction hashes, and IP addresses, may be logged for security, compliance, and operational purposes. Wallet addresses and all transactions on public blockchains are permanently and publicly visible on-chain. MangoSwap has no control over the public visibility of on-chain data.
            </p>
            <p className="mt-3">
              By using the Platform, you acknowledge that your on-chain activity is public and that MangoSwap may be required to provide information to law enforcement or regulatory authorities if compelled by applicable law.
            </p>
          </Section>

          {/* 16 */}
          <Section title="16. Governing Law and Dispute Resolution">
            <p>
              These Terms and any dispute or claim arising out of or in connection with them (including non-contractual disputes or claims) shall be governed by and construed in accordance with applicable laws, without regard to any conflict of law principles that would require the application of the laws of another jurisdiction.
            </p>
            <p className="mt-3">
              Any dispute arising out of or relating to these Terms or your use of the Platform that cannot be resolved informally shall be submitted to binding arbitration. You waive any right to a jury trial or to participate in a class action lawsuit against MangoSwap. MangoSwap reserves the right to seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of its intellectual property rights.
            </p>
          </Section>

          {/* 17 */}
          <Section title="17. Sanctions Compliance">
            <p>
              MangoSwap operates in compliance with all applicable economic and trade sanctions laws and regulations, including those administered by the U.S. Office of Foreign Assets Control ("OFAC"), the United Nations Security Council, the European Union, His Majesty's Treasury (UK), and other relevant sanctions authorities.
            </p>
            <p className="mt-3">
              You represent and warrant that: (a) you are not a Specially Designated National or blocked person under OFAC regulations; (b) you are not located in, incorporated in, or a resident of any Restricted Jurisdiction; (c) you will not use the Platform in any manner that would cause MangoSwap to violate any applicable sanctions laws; and (d) none of your funds originate from sanctioned jurisdictions or entities.
            </p>
            <p className="mt-3">
              MangoSwap reserves the right to block access to the Platform from any jurisdiction at any time, with or without notice, and to freeze, refuse, or report any transaction it believes, in its sole discretion, may violate applicable sanctions laws.
            </p>
          </Section>

          {/* 18 */}
          <Section title="18. Termination">
            <p>
              MangoSwap reserves the right to terminate, suspend, or restrict your access to the Platform at any time, for any reason, without notice and without liability. Reasons for termination may include, without limitation, suspected fraud, sanctions violations, geographic restriction violations, or any breach of these Terms.
            </p>
            <p className="mt-3">
              Upon termination, all rights granted to you under these Terms will immediately cease. Sections that by their nature should survive termination shall survive, including without limitation Sections 4 (No Responsibility for Transactions), 12 (Limitation of Liability), 13 (Disclaimer of Warranties), 14 (Indemnification), and 16 (Governing Law).
            </p>
          </Section>

          {/* 19 */}
          <Section title="19. Force Majeure">
            <p>
              MangoSwap shall not be liable for any failure or delay in performance caused by circumstances beyond its reasonable control, including but not limited to acts of God, war, terrorism, government action, blockchain network failures, cyberattacks, internet outages, regulatory actions, or changes in applicable law.
            </p>
          </Section>

          {/* 20 */}
          <Section title="20. Severability and Waiver">
            <p>
              If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be enforced to the maximum extent permissible, and the remaining provisions shall continue in full force and effect. MangoSwap's failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.
            </p>
          </Section>

          {/* 21 */}
          <Section title="21. Entire Agreement">
            <p>
              These Terms constitute the entire agreement between you and MangoSwap with respect to the subject matter hereof and supersede all prior and contemporaneous agreements, representations, warranties, and understandings, whether written or oral, relating to the Platform.
            </p>
          </Section>

          {/* 22 */}
          <Section title="22. Contact">
            <p>
              If you have any questions regarding these Terms, you may contact MangoSwap through the official channels listed at <span className="text-[#3CF902]">app.mangoswap.io</span>. MangoSwap does not provide legal, financial, or tax advice and any response to your inquiry should not be construed as such.
            </p>
          </Section>

          {/* Footer acknowledgement */}
          <div className="border border-[#3CF902]/30 rounded-xl p-5 bg-[#3CF902]/5 mt-10">
            <p className="text-white font-semibold text-center text-base">
              BY USING MANGOSWAP, YOU CONFIRM THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE IN THEIR ENTIRETY.
            </p>
            <p className="text-gray-400 text-center text-xs mt-2">
              You also confirm that you are not a resident, citizen, or national of any Restricted Jurisdiction, and that your use of the Platform complies with all applicable laws.
            </p>
          </div>

          <p className="text-center text-gray-600 text-xs pb-10">
            © {new Date().getFullYear()} MangoSwap. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-base font-bold text-white mb-3 border-l-2 border-[#3CF902] pl-3">{title}</h3>
      <div className="text-gray-400 pl-1">{children}</div>
    </div>
  );
}
