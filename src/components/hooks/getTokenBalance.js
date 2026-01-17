import { useAccount, useWriteContract, useReadContract,useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, parseAbi } from 'viem';
import { useEffect, useState } from 'react';

const useTokenBalance = (userAddress,token)=>{
    const [balance, setBalance] = useState('0.0');
      // ERC-20 ABI for the approve function
    const erc20Abi = parseAbi([
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function balanceOf(address account) public view returns (uint256)',
        'function decimals() public view returns (uint8)',
    ]);
    //try{
        // Read user's token balance
        const {
            data: userBalance,
            isError: balanceError,
            isLoading: balanceLoading,
            refetch: refetchBalance,
        } = useReadContract({
            address: token?.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
            // query: {
            //     enabled: !!address && !!token?.address,
            // },
        });
        useEffect(()=>{
            if(userBalance){
                setBalance(formatUnits(userBalance))
            }
        }, [userBalance])

    return (balance)
        
    // }catch(e){
    //     console.log(e)
    //     return 0
    // }

}
export default useTokenBalance