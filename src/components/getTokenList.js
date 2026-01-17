import React, { useState, useEffect } from 'react';
import { Button,Modal, ListGroup, Image, Form, Badge } from 'react-bootstrap';
import { getAllTokensFromAllChains } from '../config/tokenLists';
import chainConfig from '../services/chainConfig';

const CallTokenList = ({ show, onHide, onTokenSelect, onChainSelect, chainInfo, filterByChainId = null }) => {
    const [tokenList, setTokenList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showChainModal, setShowChainModal] = useState(false);

    useEffect(() => {
        if (show) {
            setLoading(true);
            setError(null);
            try {
                // Get all tokens from all chains
                let allTokens = getAllTokensFromAllChains();
                
                // Filter by chainId if filterByChainId is provided
                if (filterByChainId !== null && filterByChainId !== undefined) {
                    allTokens = allTokens.filter(token => token.chainId === filterByChainId);
                }
                
                // Helper function to get token icon with multiple fallbacks
                const getTokenIcon = (token) => {
                    // If logoURI is provided, use it
                    if (token.logoURI) {
                        return token.logoURI;
                    }
                    
                    // Map chain IDs to TrustWallet blockchain names
                    const chainMap = {
                        1: 'ethereum',
                        8453: 'base',
                        42161: 'arbitrum',
                        56: 'smartchain',
                        137: 'polygon',
                        10: 'optimism',
                        43114: 'avalanchec',
                    };
                    
                    const chainName = chainMap[token.chainId] || 'ethereum';
                    const address = token.address;
                    
                    // Try TrustWallet assets first (most reliable)
                    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${address}/logo.png`;
                };
                
                const formattedTokens = allTokens.map(token => ({
                    symbol: token.symbol,
                    address: token.address,
                    img: getTokenIcon(token),
                    decimals: token.decimals,
                    name: token.name,
                    chainId: token.chainId, // Include chainId for reference
                }));
                setTokenList(formattedTokens);
                setLoading(false);
            } catch (err) {
                console.error("Error loading tokens from static list:", err);
                setError("Failed to load tokens. Please try again.");
                setLoading(false);
            }
        }
    }, [show, filterByChainId]);

    const filteredTokens = tokenList.filter((token) =>
        token.address.includes(searchTerm) ||  token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* Token Selection Modal */}
            <Modal show={show} onHide={onHide} centered size="md">
                <Modal.Header closeButton>
                    <Modal.Title>Select a Token</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '400px', maxWith:'10px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        {/**Search Bar for tokens  */}
                        <Form.Control
                            type="text"
                            placeholder="Search tokens..."
                            value={searchTerm}
                            onChange={(e) => {
                                console.log('get token list search item console',e.target.value)
                                setSearchTerm(e.target.value)
                            }}
                            style={{ flex: 1, paddingRight: '40px' }} // Space for button
                        />
                    </div>
                    {loading ? (
                        <div>Loading...</div>
                    ) : error ? (
                        <div>Error: {error.message || error}</div>
                    ) : (
                        <ListGroup>
                            {filteredTokens.length > 0 ? (
                                filteredTokens.map((token, index) => {
                                    const chain = token.chainId ? chainConfig.getChain(token.chainId) : null;
                                    
                                    return (
                                        <ListGroup.Item key={index} action onClick={() => onTokenSelect(token)}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Image
                                                        src={token.img}
                                                        roundedCircle
                                                        style={{ width: '32px', height: '32px', marginRight: '12px' }}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/logo192.png';
                                                        }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{token.symbol}</div>
                                                        {token.name && (
                                                            <div style={{ fontSize: '0.875rem', color: '#666' }}>{token.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {chain && (
                                                    <Badge bg="secondary">{chain.chainName || `Chain ${token.chainId}`}</Badge>
                                                )}
                                            </div>
                                        </ListGroup.Item>
                                    );
                                })
                            ) : (
                                <div>No tokens found</div>
                            )}
                        </ListGroup>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default CallTokenList;
