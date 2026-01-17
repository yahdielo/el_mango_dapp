import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Tokenomics = () => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <Row className="align-items-center justify-content-center h-100">
        {/* Text Section */}
        <Col md={8} className="d-flex flex-column justify-content-center align-items-center text-center">
          <h1 className="fw-bold display-4">$MANGO Tokenomics</h1>
          <h3 className="fw-bold">Token Supply:</h3>
          <h2 className="fw-bold">100,000,000,000</h2>
          
          <Card
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)", // Darker background for better contrast
              color: "white",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              maxWidth: "600px" // Prevents overflow
            }}>
            <Card.Body>
              <p className="mb-0">
                <strong>Token Distribution:</strong> <br />
                🔹 <strong>10% Dev Wallet:</strong> 5% locked🔒  for 1.5 years, 5% locked🔒 for 3 years <br />
                🔥 <strong>10% Burned</strong> <br />
                💰 <strong>42% Pre-sale</strong> <br />
                ✈️ <strong>11% Holders Airdrop in Phases:</strong> <br />
                - Phase 1: 2.75% distributed 3 months after launched. <br />
                - Phase 2: 2.75% distributed 6 months after launched. <br />
                - Phase 3: 2.75% distributed 1 year after launched. <br />
                - Phase 4: 2.75% distributed 1.5 years after launched.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Tokenomics;
