import React, { useState } from "react";
import { Container, Row, Col, Card, Badge, Tab, Tabs } from "react-bootstrap";
import { 
  ShieldCheck, 
  Globe, 
  Lightning, 
  People, 
  Rocket, 
  CheckCircle,
  Calendar,
  Code,
  Wallet,
  Link45deg
} from "react-bootstrap-icons";
import Mango from '../imgs/mangoAboutUs.png';
import '../App.css';
import './css/AboutUs.css';

const AboutUs = () => {
  const [activeTab, setActiveTab] = useState('about');

  const features = [
    {
      icon: <Wallet size={24} />,
      title: 'Self-Custody',
      description: 'You control your keys. We never hold your funds.'
    },
    {
      icon: <Globe size={24} />,
      title: 'Multi-Chain',
      description: 'Swap across 12+ blockchain networks seamlessly.'
    },
    {
      icon: <Lightning size={24} />,
      title: 'Fast & Efficient',
      description: 'Optimized routes for the best prices and speeds.'
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Secure',
      description: 'Built with security best practices and audits.'
    },
  ];

  const roadmap = [
    {
      quarter: 'Q1 2024',
      status: 'completed',
      items: [
        'Multi-chain swap infrastructure',
        'Base chain integration',
        'Referral system launch',
        'Whitelist tier system'
      ]
    },
    {
      quarter: 'Q2 2024',
      status: 'completed',
      items: [
        'LayerSwap integration',
        'Cross-chain swaps',
        'Staking feature',
        'Liquidity pools'
      ]
    },
    {
      quarter: 'Q3 2024',
      status: 'in-progress',
      items: [
        'Advanced analytics dashboard',
        'Mobile app optimization',
        'Additional DEX integrations',
        'Yield farming features'
      ]
    },
    {
      quarter: 'Q4 2024',
      status: 'planned',
      items: [
        'NFT marketplace integration',
        'Governance token launch',
        'DAO structure',
        'Institutional features'
      ]
    },
  ];

  const team = [
    {
      name: 'Development Team',
      role: 'Core Engineering',
      description: 'Building the future of decentralized finance with cutting-edge technology.'
    },
    {
      name: 'Security Team',
      role: 'Security & Audits',
      description: 'Ensuring the highest security standards through continuous audits and monitoring.'
    },
    {
      name: 'Community Team',
      role: 'Community & Growth',
      description: 'Fostering a vibrant community and driving adoption across all chains.'
    },
  ];

  return (
    <Container className="about-us-container">
      <Row className="mb-4">
        <Col xs={12} className="text-center mb-4">
          <img
            src={Mango}
            alt="Mango Logo"
            className="about-us-logo"
          />
          <h1 className="about-us-title">Mango DeFi</h1>
          <p className="about-us-subtitle">
            Decentralized Finance Made Simple
          </p>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="about-us-tabs mb-4"
      >
        <Tab eventKey="about" title="About">
          <Row className="mt-4">
            <Col md={6}>
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Our Mission</h3>
                  <p className="card-text">
                    Mango DeFi is a Telegram mini app designed to facilitate blockchain token exchanges 
                    across multiple chains. Unlike most Telegram bots that are non-intuitive and require 
                    users to deposit their funds, going against the crypto motto <strong>"NOT YOUR KEYS, 
                    NOT YOUR CRYPTO"</strong>.
                  </p>
                  <p className="card-text">
                    At Mango DeFi, we don't want to control the keys to your funds. Instead, we empower 
                    you to have full control over your finances! Our platform enables seamless swaps 
                    while maintaining true decentralization and self-custody.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Why Choose Mango DeFi?</h3>
                  <ul className="feature-list">
                    <li>
                      <strong>Self-Custody:</strong> Your keys, your crypto. We never hold your funds.
                    </li>
                    <li>
                      <strong>Multi-Chain:</strong> Swap across 12+ blockchain networks from one interface.
                    </li>
                    <li>
                      <strong>User-Friendly:</strong> Intuitive interface designed for both beginners and experts.
                    </li>
                    <li>
                      <strong>Secure:</strong> Built with security best practices and regular audits.
                    </li>
                    <li>
                      <strong>Transparent:</strong> Open-source code and transparent fee structure.
                    </li>
                    <li>
                      <strong>Rewarding:</strong> Earn rewards through referrals and staking.
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col xs={12}>
              <h3 className="section-title">Key Features</h3>
            </Col>
            {features.map((feature, index) => (
              <Col md={6} lg={3} key={index} className="mb-3">
                <Card className="feature-card h-100">
                  <Card.Body className="text-center">
                    <div className="feature-icon">
                      {feature.icon}
                    </div>
                    <h5 className="feature-title">{feature.title}</h5>
                    <p className="feature-description">{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="mt-4">
            <Col xs={12}>
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Our Technology</h3>
                  <Row>
                    <Col md={6}>
                      <h5>Supported Chains</h5>
                      <div className="chain-badges">
                        <Badge bg="primary" className="me-2 mb-2">Base</Badge>
                        <Badge bg="primary" className="me-2 mb-2">Arbitrum</Badge>
                        <Badge bg="primary" className="me-2 mb-2">Polygon</Badge>
                        <Badge bg="primary" className="me-2 mb-2">Optimism</Badge>
                        <Badge bg="primary" className="me-2 mb-2">Avalanche</Badge>
                        <Badge bg="primary" className="me-2 mb-2">BNB Chain</Badge>
                        <Badge bg="primary" className="me-2 mb-2">Ethereum</Badge>
                        <Badge bg="primary" className="me-2 mb-2">And 5+ more...</Badge>
                      </div>
                    </Col>
                    <Col md={6}>
                      <h5>Key Integrations</h5>
                      <ul className="integration-list">
                        <li><Code size={16} className="me-2" />LayerSwap for cross-chain swaps</li>
                        <li><Link45deg size={16} className="me-2" />Multiple DEX aggregators</li>
                        <li><ShieldCheck size={16} className="me-2" />Smart contract audits</li>
                        <li><Globe size={16} className="me-2" />Multi-chain infrastructure</li>
                      </ul>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="team" title="Team">
          <Row className="mt-4">
            <Col xs={12} className="mb-4">
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Our Team</h3>
                  <p className="card-text">
                    Mango DeFi is built by a dedicated team of developers, security experts, and 
                    community managers committed to making decentralized finance accessible to everyone.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            {team.map((member, index) => (
              <Col md={4} key={index} className="mb-4">
                <Card className="team-card h-100">
                  <Card.Body className="text-center">
                    <div className="team-icon">
                      <People size={48} />
                    </div>
                    <h5 className="team-name">{member.name}</h5>
                    <Badge bg="info" className="mb-3">{member.role}</Badge>
                    <p className="team-description">{member.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="mt-4">
            <Col xs={12}>
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Join Our Team</h3>
                  <p className="card-text">
                    We're always looking for talented individuals to join our mission. If you're 
                    passionate about DeFi and want to make a difference, we'd love to hear from you.
                  </p>
                  <p className="card-text">
                    <strong>Open Positions:</strong> Smart Contract Developers, Frontend Engineers, 
                    Security Auditors, Community Managers, and more.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="roadmap" title="Roadmap">
          <Row className="mt-4">
            <Col xs={12} className="mb-4">
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Our Roadmap</h3>
                  <p className="card-text">
                    We're constantly building and improving Mango DeFi. Here's what we've accomplished 
                    and what's coming next.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            {roadmap.map((quarter, index) => (
              <Col md={6} key={index} className="mb-4">
                <Card className={`roadmap-card ${quarter.status}`}>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <Calendar size={20} className="me-2" />
                      <strong>{quarter.quarter}</strong>
                    </div>
                    <Badge bg={
                      quarter.status === 'completed' ? 'success' :
                      quarter.status === 'in-progress' ? 'warning' :
                      'secondary'
                    }>
                      {quarter.status === 'completed' ? (
                        <>
                          <CheckCircle size={14} className="me-1" />
                          Completed
                        </>
                      ) : quarter.status === 'in-progress' ? (
                        <>
                          <Rocket size={14} className="me-1" />
                          In Progress
                        </>
                      ) : (
                        'Planned'
                      )}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <ul className="roadmap-items">
                      {quarter.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          {quarter.status === 'completed' && (
                            <CheckCircle size={14} className="me-2 text-success" />
                          )}
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="mt-4">
            <Col xs={12}>
              <Card className="about-card">
                <Card.Body>
                  <h3 className="card-title">Future Vision</h3>
                  <p className="card-text">
                    Our long-term vision is to become the go-to platform for decentralized finance 
                    across all major blockchain networks. We're working towards:
                  </p>
                  <ul className="vision-list">
                    <li>Full decentralization through DAO governance</li>
                    <li>Expansion to 20+ blockchain networks</li>
                    <li>Advanced DeFi features including yield farming and lending</li>
                    <li>Mobile native applications for iOS and Android</li>
                    <li>Institutional-grade features for enterprise users</li>
                    <li>Comprehensive analytics and portfolio management</li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AboutUs;