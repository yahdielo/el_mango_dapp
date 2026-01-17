/**
 * ChainModal Component
 * 
 * Modal for selecting chains with status indicators, features, and type filtering
 */

import React, { useState, useMemo } from 'react';
import { Modal, ListGroup, Form, Badge, Image } from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, XCircle } from 'react-bootstrap-icons';
import chainConfig from '../services/chainConfig';
import ChainStatusBadge from './ChainStatusBadge';

const ChainModal = ({ show, onHide, onChainSelect, filterType = null, excludeChainIds = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByType, setFilterByType] = useState(filterType || 'all');

    // Get all chains from ChainConfigService
    const allChains = chainConfig.getAllChains();

    // Filter chains
    const filteredChains = useMemo(() => {
        let chains = allChains;

        // Filter by type
        if (filterByType !== 'all') {
            chains = chains.filter(chain => {
                if (filterByType === 'EVM') {
                    return chain.type === 'EVM' || !chain.type;
                }
                return chain.type === filterByType;
            });
        }

        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            chains = chains.filter(chain =>
                chain.chainName.toLowerCase().includes(searchLower) ||
                chain.chainId.toString().includes(searchLower)
            );
        }

        // Exclude specified chain IDs
        if (excludeChainIds.length > 0) {
            chains = chains.filter(chain => !excludeChainIds.includes(parseInt(chain.chainId)));
        }

        // Sort by chain name
        return chains.sort((a, b) => a.chainName.localeCompare(b.chainName));
    }, [allChains, filterByType, searchTerm, excludeChainIds]);

    const handleChainSelect = (chain) => {
        if (onChainSelect) {
            onChainSelect(chain);
        }
        onHide();
    };

    const getChainTypeBadge = (chain) => {
        const type = chain.type || 'EVM';
        const variants = {
            EVM: 'primary',
            TRON: 'info',
            SOLANA: 'warning',
            BITCOIN: 'secondary'
        };
        return (
            <Badge bg={variants[type] || 'secondary'} className="ms-2">
                {type}
            </Badge>
        );
    };

    const getFeatureBadges = (chain) => {
        const features = chainConfig.getFeatureFlags(parseInt(chain.chainId));
        const badges = [];

        if (features.directSwap) {
            badges.push(<Badge key="direct" bg="success" className="me-1">Direct Swap</Badge>);
        }
        if (features.layerSwap) {
            badges.push(<Badge key="layerswap" bg="info" className="me-1">LayerSwap</Badge>);
        }
        if (features.referralSystem) {
            badges.push(<Badge key="referral" bg="primary" className="me-1">Referral</Badge>);
        }
        if (features.whitelist) {
            badges.push(<Badge key="whitelist" bg="warning" className="me-1">Whitelist</Badge>);
        }

        return badges;
    };

    const getStatusIcon = (chain) => {
        const status = chain.status || 'active';
        if (status === 'active' || status === 'operational') {
            return <CheckCircle size={16} className="text-success me-1" />;
        } else if (status === 'maintenance' || status === 'degraded') {
            return <ExclamationTriangle size={16} className="text-warning me-1" />;
        } else if (status === 'inactive' || status === 'offline') {
            return <XCircle size={16} className="text-danger me-1" />;
        }
        return null;
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Select a Chain</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Search and Filter */}
                <div className="mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Search chains..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                    />
                    <Form.Select
                        value={filterByType}
                        onChange={(e) => setFilterByType(e.target.value)}
                    >
                        <option value="all">All Chains</option>
                        <option value="EVM">EVM Chains</option>
                        <option value="TRON">Tron</option>
                        <option value="SOLANA">Solana</option>
                        <option value="BITCOIN">Bitcoin</option>
                    </Form.Select>
                </div>

                {/* Chain List */}
                <ListGroup style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredChains.length === 0 ? (
                        <ListGroup.Item>
                            <div className="text-center text-muted">
                                No chains found matching your criteria
                            </div>
                        </ListGroup.Item>
                    ) : (
                        filteredChains.map((chain) => {
                            const chainId = parseInt(chain.chainId);
                            const isNonEVM = chain.type && chain.type !== 'EVM';

                            return (
                                <ListGroup.Item
                                    key={chain.chainId}
                                    action
                                    onClick={() => handleChainSelect(chain)}
                                    className="d-flex align-items-start"
                                >
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-1">
                                            {chain.img && (
                                                <Image
                                                    src={chain.img}
                                                    roundedCircle
                                                    style={{ width: '32px', height: '32px', marginRight: '10px' }}
                                                />
                                            )}
                                            <strong>{chain.chainName}</strong>
                                            {getChainTypeBadge(chain)}
                                            {getStatusIcon(chain)}
                                            <ChainStatusBadge chainId={chainId} />
                                        </div>
                                        <div className="ms-4 mb-1">
                                            <small className="text-muted">Chain ID: {chain.chainId}</small>
                                        </div>
                                        <div className="ms-4 mb-1">
                                            {getFeatureBadges(chain)}
                                        </div>
                                        {isNonEVM && (
                                            <div className="ms-4">
                                                <Badge bg="info" className="mt-1">
                                                    {chain.type === 'SOLANA' || chain.type === 'BITCOIN' 
                                                        ? 'Uses LayerSwap' 
                                                        : 'Non-EVM Chain'}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </ListGroup.Item>
                            );
                        })
                    )}
                </ListGroup>
            </Modal.Body>
        </Modal>
    );
};

export default ChainModal;

