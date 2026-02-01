import React, { useState } from 'react';
import { useReferralChain } from '../../hooks/useReferralChain';
import SettingsSection from './SettingsSection';
import '../css/SettingsMobile.css';

const ReferralSettings = ({ address, chainId }) => {
    const { referral, loading } = useReferralChain(false);
    const [copied, setCopied] = useState(false);

    const referralLink = address ? `${window.location.origin}?ref=${address}` : null;

    const handleCopyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return 'None';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (loading) {
        return (
            <SettingsSection title="Referral & Rewards">
                <div className="settings-loading">Loading referral information...</div>
            </SettingsSection>
        );
    }

    return (
        <SettingsSection title="Referral & Rewards">
            {referralLink && (
                <div className="settings-item">
                    <div className="settings-item-label">Your Referral Link</div>
                    <div className="settings-referral-link">
                        <input 
                            type="text" 
                            value={referralLink} 
                            readOnly 
                            className="settings-referral-input"
                        />
                        <button 
                            className="settings-copy-button"
                            onClick={handleCopyLink}
                            title="Copy referral link"
                        >
                            {copied ? (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.5 4L6 11.5L2.5 8" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M5.5 3.5H3.5C2.67 3.5 2 4.17 2 5V12.5C2 13.33 2.67 14 3.5 14H11C11.83 14 12.5 13.33 12.5 12.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    <path d="M9.5 2H13.5C14.33 2 15 2.67 15 3.5V9.5M9.5 2H6.5C5.67 2 5 2.67 5 3.5V9.5M9.5 2V6.5H15M15 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {referral && (
                <>
                    <div className="settings-item">
                        <div className="settings-item-label">Your Referrer</div>
                        <div className="settings-item-value">{formatAddress(referral.referrerAddress)}</div>
                    </div>

                    {referral.earnings && referral.earnings > 0 && (
                        <div className="settings-item">
                            <div className="settings-item-label">Total Earnings</div>
                            <div className="settings-item-value settings-earnings">
                                {referral.earnings.toFixed(4)} MANGO
                            </div>
                        </div>
                    )}

                    {referral.referrals && referral.referrals.length > 0 && (
                        <div className="settings-item">
                            <div className="settings-item-label">Total Referrals</div>
                            <div className="settings-item-value">{referral.referrals.length}</div>
                        </div>
                    )}
                </>
            )}

            <div className="settings-item">
                <div className="settings-item-description">
                    Share your referral link to earn rewards when others make swaps
                </div>
            </div>
        </SettingsSection>
    );
};

export default ReferralSettings;

