import React from 'react';
import chainConfig from '../../services/chainConfig';
import '../css/PortfolioMobile.css';

const ChainTabs = ({ selectedChain, onChainSelect }) => {
    const supportedChains = chainConfig.getAllChains() || [];

    return (
        <div className="portfolio-chain-tabs">
            <button
                className={`portfolio-chain-tab ${selectedChain === null ? 'active' : ''}`}
                onClick={() => onChainSelect(null)}
            >
                All Chains
            </button>
            {supportedChains.map((chain) => (
                <button
                    key={chain.chainId}
                    className={`portfolio-chain-tab ${selectedChain === parseInt(chain.chainId) ? 'active' : ''}`}
                    onClick={() => onChainSelect(parseInt(chain.chainId))}
                >
                    {chain.chainName}
                </button>
            ))}
        </div>
    );
};

export default ChainTabs;

