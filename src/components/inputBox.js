import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract,useBalance, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, formatUnits, parseAbi } from 'viem';
import { Card, Form } from 'react-bootstrap';
import useGetEthBalance from './hooks/getEthBalance.js'
import useTokenBalance from './hooks/getTokenBalance.js';
import SelectTokenButton from './selecTokenButton.js';
import PercentageButtons from './precentageButton.js';
import chainConfig from '../services/chainConfig';
//import './css/SwapComponent.css'; // We'll create this CSS file

const InputBoxes = ({ 
  chainInfo,
  userAddress,
  amount1,
  onChange,
  onBlur,
  isSelected,
  token,
  onClick,
  usdAmount,
  _setAmount
}) => {
  const [userBalance,setUserBalance] =useState();
  const chainId = useChainId();

  let ethBalance = useGetEthBalance(userAddress,token)
  let tokenBalance = useTokenBalance(userAddress,token)
  
  // Get minimum amount for display
  const minimumAmounts = chainInfo?.minimumAmounts || (chainId ? chainConfig.getMinimumAmounts(chainId) : null);
  const chain = chainId ? chainConfig.getChain(chainId) : null;
  
  useEffect(()=>{
    if(token && token.symbol === 'ETH'){
      setUserBalance(ethBalance)
    }else if(token){
      setUserBalance((1*tokenBalance).toFixed(5))
    }
  },[ethBalance,tokenBalance,token])
  console.log(userBalance)

  return (
  <Card className="swap-card" 
      style={{backgroundColor:'rgba(255, 255, 255, 0.72)'}}>
          <Card.Body>
            {/* Top buttons (Swap, Limit, Buy, Sell) */}
            {/* <div className="swap-mode-buttons">
              <button className="mode-button active">Swap</button>
              <button className="mode-button">Limit</button>
              <button className="mode-button">Buy</button>
              <button className="mode-button">Sell</button>
            </div> */}
    
            {/* Input section */}
              {/* Percentage buttons that appear on hover */}
            <div className="percent-buttons"
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0px',
                marginBottom:'10px'
                }}>
                      {/*NOTE E:
                      PERCANTEG BUTTONS
                      HAS TO SET THE AMOUNT ONES A BUTTON IS HiT
                      */}
                <PercentageButtons userBalance={userBalance} setAmount={_setAmount}/>
                {/**<button onClick={() => handlePercentClick(100)}>Max</button>*/}
            </div>
              
            <div 
            className="token-input-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                                                            
                }}
            //onMouseEnter={() => setShowPercentButtons(true)}
            //onMouseLeave={() => setShowPercentButtons(false)}
            >
        
                <div className="input-row" style={{}}>
                    <Form.Control
                    type="text"
                    placeholder={!amount1 ? '0.0':amount1 }
                    value={amount1}
                    onChange={ onChange}
                    onBlur={onBlur}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'black',
                        fontSize: '2rem', // Larger font size
                        fontWeight: '500',
                        padding: '0',
                        width: '100%',
                        boxShadow: 'none',
                        height: '100%' // Take full height
                }}
                    />  
                </div>
                    <div className='tokenButtonSelect' style={{
                        // Fixed width to match balance area
                        }}>
                    <SelectTokenButton isSelected={isSelected} token={token} onClick={onClick} />
                    </div>
            </div>
    
            <div className="display_usdValue_and_amount" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: '8px'
                }}>                    
                {/* USD value display - aligned to the right */}
                    <div className="usd-value" style={{
                        textAlign: 'left',
                        color: '#6C7284',
                        fontSize: '0.875rem'
                    }}>
                        ${usdAmount || '0.00'}
                    </div>
                  {/* Balance display - aligned to the left */}
                    <div className="balance-display" style={{
                        textAlign: 'rigth',
                        color: '#6C7284',
                        fontSize: '0.875rem'
                    }}>
                        Balance: {token && token.empty ?  '0.0':(userBalance || '0')} {/** {selectedToken1?.symbol || ''}*/}
                    </div>
                </div>
                
                {/* Minimum Amount Hint */}
                {minimumAmounts?.swap && (
                    <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#666', 
                        textAlign: 'right',
                        marginTop: '0.25rem',
                        paddingRight: '0.5rem'
                    }}>
                        Min: {minimumAmounts.swap} {chain?.nativeCurrency?.symbol || 'tokens'}
                    </div>
                )}
          </Card.Body>
        </Card>
        
  );
};

export default InputBoxes;