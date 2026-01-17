
import { Button, Image, Badge } from 'react-bootstrap';
import chainConfig from '../services/chainConfig';

const SelectTokenButton = ({ isSelected, token, onClick}) => {
    // Get chain information if token has chainId
    const chain = token?.chainId ? chainConfig.getChain(token.chainId) : null;
    
    return (
        <Button
            variant="outline-secondary"
            onClick={onClick}
            style={{
                position: 'absolute',
                right: '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0 5px',
                width: chain ? '120px' : '95px', // Wider if chain badge is shown
                height: '50px',
                textAlign: 'center',
                fontSize: '0.8rem',
                backgroundColor: isSelected ? undefined : "#F26E01", // Mango orange for unselected
                borderColor: isSelected ? undefined : '#FFA500', // Match the border color
                color: isSelected ? undefined : '#FFFFFF', // White text for unselected
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '2px',
            }}
        >
            {isSelected ? ( 
                <>
                    {token.img && (
                        <Image
                            src={token.img}
                            alt={token.symbol || 'Token'}
                            roundedCircle
                            style={{ width: '20px', height: '20px', marginRight: '4px' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/logo192.png';
                            }}
                        />
                    )}
                    <span style={{ fontSize: '0.8rem' }}>{token.symbol || 'Token'}</span>
                    {chain && (
                        <Badge bg="secondary" style={{ fontSize: '0.65rem', marginLeft: '2px' }}>
                            {chain.chainName || `Chain ${token.chainId}`}
                        </Badge>
                    )}
                </>
            ) : (
                'Select Token'
            )}
        </Button>

    );
};

export default SelectTokenButton;

