import React from 'react';
import '../css/PortfolioMobile.css';
import chainConfig from '../../services/chainConfig';

const AssetCard = ({ asset }) => {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatBalance = (balance) => {
        const num = parseFloat(balance);
        if (num === 0) return '0.00';
        if (num < 0.0001) return num.toExponential(2);
        return num.toLocaleString('en-US', {
            maximumFractionDigits: 6,
            minimumFractionDigits: 2
        });
    };

    const getTokenIcon = (asset) => {
        // High-quality token icons by symbol
        const TOKEN_ICONS = {
            BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
            ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
            // Use local Mango app logo as the Mango token icon
            MANGO: '/logo192.png',
        };

        const tokenIconUrl = TOKEN_ICONS[asset.symbol];

        if (tokenIconUrl) {
            return (
                <div className="asset-icon">
                    <img src={tokenIconUrl} alt={asset.symbol} />
                </div>
            );
        }

        // Fallback to chain logo if available
        const chain = chainConfig.getChain(asset.chainId);
        const chainImg = chain?.img;
        if (chainImg) {
            return (
                <div className="asset-icon">
                    <img src={chainImg} alt={chain?.chainName || asset.symbol} />
                </div>
            );
        }

        // Generic fallback
        return (
            <div className="asset-icon asset-icon-default">
                {asset.symbol?.[0] || '?'}
            </div>
        );
    };

    return (
        <div className="portfolio-asset-card">
            <div className="portfolio-asset-header">
                <div className="portfolio-asset-info">
                    {getTokenIcon(asset)}
                    <div className="portfolio-asset-details">
                        <div className="portfolio-asset-symbol">{asset.symbol}</div>
                        <div className="portfolio-asset-name">{asset.name}</div>
                    </div>
                </div>
                <div className="portfolio-asset-value">{formatCurrency(asset.usdValue)}</div>
            </div>

            <div className="portfolio-asset-body">
                <div className="portfolio-asset-balance">
                    <span className="portfolio-asset-balance-label">Balance:</span>
                    <span className="portfolio-asset-balance-value">
                        {formatBalance(asset.balance)} {asset.symbol}
                    </span>
                </div>
                <div className="portfolio-asset-chain">{asset.chainName}</div>
            </div>

            <div className="portfolio-asset-footer">
                <div className={`portfolio-asset-change ${asset.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
                </div>
            </div>
        </div>
    );
};

export default AssetCard;

