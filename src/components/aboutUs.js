import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Mango from '../imgs/mangoAboutUs.png';
import '../App.css'

const AboutUs = () => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
      <Row className="align-items-center">
        {/* Image on the Left */}
        <Col md={5} className="text-center">
        <img
                src={Mango}
                alt="Mango Logo"
             
              />
        </Col>

        {/* Text on the Right */}
        <Col md={7}>
          <h2 className="text-dark fs-1">About Us</h2>
          <p className="text-dark fs-4">
            MangoDefi es un telegram mini app para facilitar el intercambio de blockchain base tokens.
            La mayoria de los bots de telegram son no intuitivos para usar, y requieren que el usuario deposite sus fondos
            iendo en contra de el crypto motto "NOT YOUR KEY NOT YOUR CRYPTO".

            MangoDefi no deseamos controlar las llaves a tus fondos, si no que tu tengas el poder de tus finansas!

          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default AboutUs;