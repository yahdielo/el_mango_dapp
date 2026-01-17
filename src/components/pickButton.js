import ApproveButton from './approveButton';
import ConnectionButton from './connectButton';
import SwitchChain from './switchChain';
import ConnectWallet from './connectWallet';
import SwapButton from './swapButton';
import { useAccount, useChainId } from 'wagmi';
import { useEffect } from 'react';
import { checkMinimumAmount } from '../utils/chainValidation';

const PickButton = ({ token0, token1, amount, chain, chatId, referrer,chainInfo }) => {
    const { address: activeAccount, isConnected } = useAccount();

    //let status = activeAccount || null;
    
    /**
     * @Dev
     * This component is for the swapBox element,
     * is ment to determined is the user is connected or  not
     * if user hasnt selected a chain:
     * -> swap will be sent to the chain the wallet is connected to.
     *
     */

    const pickButton = () => {
        if (!isConnected || !activeAccount) {
            return <ConnectWallet />;
        }

        const appChainId = chainInfo?.chainId; //chain chosen or already in the state

        // If chainInfo is null, or tokens are missing, return ConnectionButton
        if (!chainInfo || !token0 || !token1 || !token0.address || !token1.address) {
            return <ConnectionButton />;
        }

        // Validate minimum amount before allowing swap
        if (appChainId && amount && token0?.address && token1?.address) {
            const validation = checkMinimumAmount(appChainId, amount, 'swap');
            if (!validation.isValid) {
                // Return disabled button with error message
                return (
                    <button 
                        disabled 
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.5rem',
                            backgroundColor: '#cccccc',
                            borderColor: '#999999',
                            color: '#666',
                            cursor: 'not-allowed',
                            opacity: 0.7,
                        }}
                        title={validation.message}
                    >
                        Amount Below Minimum
                    </button>
                );
            }
        }

        if( appChainId && token0?.address && token1?.address && amount !== ''){
             // Add null check for token0.symbol
             if(token0?.symbol ==='ETH' || token0?.symbol === 'BNB'){
                return <SwapButton token0={token0} token1={token1} amount={amount}  chatId={chatId} referrer={referrer} chainInfo={chainInfo}/>
             }else{
                 return <ApproveButton token0={token0} token1={token1} amount={amount}  chatId={chatId} referrer={referrer} chainInfo={chainInfo} />;
             }
        }
        // else if (userChainId != null && appChainId != null && userChainId !== appChainId) {
        //     console.log(userChainId, appChainId)
        //     return <SwitchChain chain={chain} />;
        // }
        else if (appChainId) {
            return <ConnectionButton />;
        }

        // Fallback: return ConnectionButton if no other condition is met
        return <ConnectionButton />;
    };

    return <div>{pickButton()}</div>;
};
export default PickButton;
