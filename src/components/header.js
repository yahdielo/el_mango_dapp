import { Container, Navbar } from 'react-bootstrap';
import MangoLogo from '../imgs/Mango.png';
import dotenv from 'dotenv';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import WhitelistBadge from './WhitelistBadge';

const Header = () => {
    const { open } = useAppKit();
    const { isConnected } = useAccount();
    return (
        <Navbar bg="light" expand="lg">
            <Container>
                {/* Make the logo clickable */}
                <img src={MangoLogo} width="50" height="50" alt="Mango Logo" style={{ cursor: 'pointer' }} />
                <div className="ml-auto d-flex align-items-center gap-3">
                    {/**console.log(connectionsStatus)retrn=> connected || disconnected */}

                    {isConnected && (
                        <WhitelistBadge showTooltip={true} size="sm" />
                    )}

                    {isConnected ? (
                        <div className="appkit-connect-button--connected">
                            <appkit-account-button />
                        </div>
                    ) : (
                        <div className="connect-button" onClick={() => open()}>
                            Connect
                        </div>
                    )}
                </div>
            </Container>
        </Navbar>
    );
};
export default Header;
