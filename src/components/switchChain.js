import { Button } from 'react-bootstrap';
import { useSwitchChain } from 'wagmi';

const SwitchChain = ({ chain }) => {
    console.log('Switch Network: ', chain);

    const { switchChain } = useSwitchChain(); //isPending 

    if (!chain || !chain.name) {
        return null;
    }

    const handleClick = () => {
        try {
            switchChain({ chainId: chain.id });
        } catch (error) {
            console.error('Error switching chain:', error);
        }
    };

    return (
        <Button
            onClick={handleClick}
            className="w-100"
            style={{
                padding: '1rem',
                fontSize: '1.5rem',
                backgroundColor: '#F26E01', // Mango orange
                borderColor: '#FFA500', // Match the border color
                color: '#FFFFFF', // White text for contrast
            }}
        >
            {`Cambiar red a ${chain.name}`}
        </Button>
    );
};
export default SwitchChain;
