import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { 
  CurrencyDollar, 
  TrendingUp, 
  People, 
  Lock, 
  Calendar,
  ArrowClockwise,
  Wallet,
  Fire,
  Gift,
  Briefcase
} from 'react-bootstrap-icons';
import { priceOracle } from '../services/priceOracle';
import chainConfig from '../services/chainConfig';
import { useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import './css/Tokenomics.css';

const Tokenomics = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const [tokenPrice, setTokenPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [selectedChart, setSelectedChart] = useState('distribution'); // 'distribution' or 'vesting'

  const TOTAL_SUPPLY = 100000000000; // 100 billion
  const BURNED = 10000000000; // 10 billion (10%)
  const CIRCULATING_SUPPLY = TOTAL_SUPPLY - BURNED; // 90 billion

  // Token distribution data
  const distribution = [
    { name: 'Pre-sale', percentage: 42, amount: 42000000000, color: '#F26E01', icon: <CurrencyDollar size={20} /> },
    { name: 'Dev Wallet', percentage: 10, amount: 10000000000, color: '#FF6B6B', icon: <Briefcase size={20} /> },
    { name: 'Airdrop', percentage: 11, amount: 11000000000, color: '#4ECDC4', icon: <Gift size={20} /> },
    { name: 'Burned', percentage: 10, amount: 10000000000, color: '#95A5A6', icon: <Fire size={20} /> },
    { name: 'Reserve', percentage: 27, amount: 27000000000, color: '#3498DB', icon: <Lock size={20} /> },
  ];

  // Vesting schedule
  const vestingSchedule = [
    {
      category: 'Dev Wallet - 5%',
      amount: 5000000000,
      lockPeriod: '1.5 years',
      unlockDate: null, // Would be calculated from launch date
      status: 'locked',
      color: '#FF6B6B',
    },
    {
      category: 'Dev Wallet - 5%',
      amount: 5000000000,
      lockPeriod: '3 years',
      unlockDate: null,
      status: 'locked',
      color: '#FF6B6B',
    },
    {
      category: 'Airdrop Phase 1',
      amount: 2750000000,
      lockPeriod: '3 months',
      unlockDate: null,
      status: 'distributed',
      color: '#4ECDC4',
    },
    {
      category: 'Airdrop Phase 2',
      amount: 2750000000,
      lockPeriod: '6 months',
      unlockDate: null,
      status: 'pending',
      color: '#4ECDC4',
    },
    {
      category: 'Airdrop Phase 3',
      amount: 2750000000,
      lockPeriod: '1 year',
      unlockDate: null,
      status: 'pending',
      color: '#4ECDC4',
    },
    {
      category: 'Airdrop Phase 4',
      amount: 2750000000,
      lockPeriod: '1.5 years',
      unlockDate: null,
      status: 'pending',
      color: '#4ECDC4',
    },
  ];

  // Fetch token price
  useEffect(() => {
    const fetchPrice = async () => {
      setLoadingPrice(true);
      try {
        // Try to get MANGO token price from CoinGecko or contract
        const mangoTokenAddress = chainConfig.getContractAddress(chainId || 8453, 'token');
        if (mangoTokenAddress && chainId) {
          const platformId = chainConfig.getChain(chainId)?.coingeckoId;
          if (platformId) {
            const price = await priceOracle.getTokenPrice(platformId, mangoTokenAddress);
            setTokenPrice(price);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch token price:', error);
        // Use mock price for demo
        setTokenPrice(0.0001);
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [chainId]);

  // Calculate market cap
  const marketCap = useMemo(() => {
    if (!tokenPrice) return null;
    return CIRCULATING_SUPPLY * tokenPrice;
  }, [tokenPrice]);

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Calculate pie chart segments
  const calculatePieChart = () => {
    let currentAngle = -90; // Start from top
    return distribution.map(item => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...item,
        startAngle,
        endAngle: currentAngle,
      };
    });
  };

  const pieSegments = calculatePieChart();

  // Get user's MANGO balance if connected
  const mangoTokenAddress = chainConfig.getContractAddress(chainId || 8453, 'token');
  const { data: userBalance } = useReadContract({
    address: mangoTokenAddress,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!mangoTokenAddress,
    },
  });

  const userBalanceFormatted = userBalance ? parseFloat(formatUnits(userBalance, 18)) : 0;

  return (
    <Container className="tokenomics-container">
      <Row className="mb-4">
        <Col xs={12} className="text-center">
          <h1 className="tokenomics-title">$MANGO Tokenomics</h1>
          <p className="tokenomics-subtitle">Complete Token Distribution & Vesting Information</p>
        </Col>
      </Row>

      {/* Real-Time Token Metrics */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">
                <CurrencyDollar size={24} />
              </div>
              <div className="metric-label">Token Price</div>
              <div className="metric-value">
                {loadingPrice ? (
                  <Spinner size="sm" />
                ) : tokenPrice ? (
                  `$${tokenPrice.toFixed(6)}`
                ) : (
                  'N/A'
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">
                <TrendingUp size={24} />
              </div>
              <div className="metric-label">Market Cap</div>
              <div className="metric-value">
                {marketCap ? `$${formatNumber(marketCap)}` : 'N/A'}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">
                <Wallet size={24} />
              </div>
              <div className="metric-label">Total Supply</div>
              <div className="metric-value">{formatNumber(TOTAL_SUPPLY)}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">
                <People size={24} />
              </div>
              <div className="metric-label">Circulating Supply</div>
              <div className="metric-value">{formatNumber(CIRCULATING_SUPPLY)}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Balance (if connected) */}
      {address && userBalanceFormatted > 0 && (
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="user-balance-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="balance-label">Your MANGO Balance</div>
                    <div className="balance-value">{formatNumber(userBalanceFormatted)} MANGO</div>
                    {tokenPrice && (
                      <div className="balance-usd">
                        ≈ ${formatNumber(userBalanceFormatted * tokenPrice)}
                      </div>
                    )}
                  </div>
                  <div className="balance-icon">
                    <Wallet size={48} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Chart Toggle */}
      <Row className="mb-4">
        <Col xs={12}>
          <div className="chart-toggle">
            <button
              className={`chart-toggle-btn ${selectedChart === 'distribution' ? 'active' : ''}`}
              onClick={() => setSelectedChart('distribution')}
            >
              Distribution
            </button>
            <button
              className={`chart-toggle-btn ${selectedChart === 'vesting' ? 'active' : ''}`}
              onClick={() => setSelectedChart('vesting')}
            >
              Vesting Schedule
            </button>
          </div>
        </Col>
      </Row>

      {/* Distribution Chart */}
      {selectedChart === 'distribution' && (
        <Row className="mb-4">
          <Col md={6} className="mb-4">
            <Card className="chart-card">
              <Card.Header>
                <h5 className="mb-0">Token Distribution</h5>
              </Card.Header>
              <Card.Body>
                <div className="pie-chart-container">
                  <svg viewBox="0 0 200 200" className="pie-chart">
                    {pieSegments.map((segment, index) => {
                      const startAngleRad = (segment.startAngle * Math.PI) / 180;
                      const endAngleRad = (segment.endAngle * Math.PI) / 180;
                      const largeArcFlag = segment.angle > 180 ? 1 : 0;
                      
                      const x1 = 100 + 80 * Math.cos(startAngleRad);
                      const y1 = 100 + 80 * Math.sin(startAngleRad);
                      const x2 = 100 + 80 * Math.cos(endAngleRad);
                      const y2 = 100 + 80 * Math.sin(endAngleRad);
                      
                      const pathData = [
                        `M 100 100`,
                        `L ${x1} ${y1}`,
                        `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                        'Z'
                      ].join(' ');
                      
                      return (
                        <path
                          key={index}
                          d={pathData}
                          fill={segment.color}
                          stroke="#fff"
                          strokeWidth="2"
                          className="pie-segment"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = '0.8';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = '1';
                          }}
                        />
                      );
                    })}
                  </svg>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} className="mb-4">
            <Card className="distribution-list-card">
              <Card.Header>
                <h5 className="mb-0">Distribution Breakdown</h5>
              </Card.Header>
              <Card.Body>
                <div className="distribution-list">
                  {distribution.map((item, index) => (
                    <div key={index} className="distribution-item">
                      <div className="distribution-header">
                        <div className="distribution-info">
                          <div 
                            className="distribution-color" 
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="distribution-icon">{item.icon}</div>
                          <div>
                            <div className="distribution-name">{item.name}</div>
                            <div className="distribution-percentage">{item.percentage}%</div>
                          </div>
                        </div>
                        <div className="distribution-amount">
                          {formatNumber(item.amount)} MANGO
                        </div>
                      </div>
                      <ProgressBar
                        now={item.percentage}
                        style={{ height: '8px', marginTop: '8px' }}
                      >
                        <ProgressBar
                          now={item.percentage}
                          style={{ backgroundColor: item.color }}
                        />
                      </ProgressBar>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Vesting Schedule */}
      {selectedChart === 'vesting' && (
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="vesting-card">
              <Card.Header>
                <h5 className="mb-0">Vesting Schedule</h5>
              </Card.Header>
              <Card.Body>
                <div className="vesting-timeline">
                  {vestingSchedule.map((item, index) => (
                    <div key={index} className="vesting-item">
                      <div className="vesting-line" style={{ backgroundColor: item.color }} />
                      <div className="vesting-content">
                        <div className="vesting-header">
                          <div className="vesting-info">
                            <div 
                              className="vesting-dot" 
                              style={{ backgroundColor: item.color }}
                            />
                            <div>
                              <div className="vesting-category">{item.category}</div>
                              <div className="vesting-details">
                                <Badge bg={
                                  item.status === 'distributed' ? 'success' :
                                  item.status === 'locked' ? 'warning' : 'secondary'
                                }>
                                  {item.status === 'distributed' ? 'Distributed' :
                                   item.status === 'locked' ? 'Locked' : 'Pending'}
                                </Badge>
                                <span className="vesting-period">
                                  <Lock size={14} className="me-1" />
                                  {item.lockPeriod}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="vesting-amount">
                            {formatNumber(item.amount)} MANGO
                          </div>
                        </div>
                        {item.status === 'locked' && (
                          <div className="vesting-progress">
                            <div className="progress-label">Lock Progress</div>
                            <ProgressBar
                              now={item.lockPeriod === '1.5 years' ? 50 : 25}
                              style={{ height: '10px' }}
                            >
                              <ProgressBar
                                now={item.lockPeriod === '1.5 years' ? 50 : 25}
                                style={{ backgroundColor: item.color }}
                              />
                            </ProgressBar>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Detailed Information */}
      <Row className="mb-4">
        <Col md={6} className="mb-4">
          <Card className="info-card">
            <Card.Header>
              <h5 className="mb-0">Token Details</h5>
            </Card.Header>
            <Card.Body>
              <div className="info-item">
                <span className="info-label">Total Supply:</span>
                <span className="info-value">{formatNumber(TOTAL_SUPPLY)} MANGO</span>
              </div>
              <div className="info-item">
                <span className="info-label">Circulating Supply:</span>
                <span className="info-value">{formatNumber(CIRCULATING_SUPPLY)} MANGO</span>
              </div>
              <div className="info-item">
                <span className="info-label">Burned:</span>
                <span className="info-value">{formatNumber(BURNED)} MANGO (10%)</span>
              </div>
              <div className="info-item">
                <span className="info-label">Decimals:</span>
                <span className="info-value">18</span>
              </div>
              {mangoTokenAddress && (
                <div className="info-item">
                  <span className="info-label">Contract Address:</span>
                  <code className="info-value contract-address">
                    {mangoTokenAddress.slice(0, 10)}...{mangoTokenAddress.slice(-8)}
                  </code>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="info-card">
            <Card.Header>
              <h5 className="mb-0">Lock Periods</h5>
            </Card.Header>
            <Card.Body>
              <div className="lock-item">
                <div className="lock-header">
                  <Lock size={16} className="me-2" />
                  <strong>Dev Wallet - 5%</strong>
                </div>
                <div className="lock-details">
                  Locked for 1.5 years from launch
                </div>
              </div>
              <div className="lock-item">
                <div className="lock-header">
                  <Lock size={16} className="me-2" />
                  <strong>Dev Wallet - 5%</strong>
                </div>
                <div className="lock-details">
                  Locked for 3 years from launch
                </div>
              </div>
              <div className="lock-item">
                <div className="lock-header">
                  <Calendar size={16} className="me-2" />
                  <strong>Airdrop Phases</strong>
                </div>
                <div className="lock-details">
                  <ul className="airdrop-phases">
                    <li>Phase 1: 3 months (2.75%)</li>
                    <li>Phase 2: 6 months (2.75%)</li>
                    <li>Phase 3: 1 year (2.75%)</li>
                    <li>Phase 4: 1.5 years (2.75%)</li>
                  </ul>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Refresh Button */}
      <Row>
        <Col xs={12} className="text-center">
          <button
            className="refresh-button"
            onClick={() => window.location.reload()}
          >
            <ArrowClockwise size={16} className="me-2" />
            Refresh Metrics
          </button>
        </Col>
      </Row>
    </Container>
  );
};

export default Tokenomics;
