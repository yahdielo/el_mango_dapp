// hooks/useSimpleTokenBalance.js
import { useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { parseAbi } from 'viem';
import { useState, useEffect } from 'react';

 const useGetEthBalance = (userAddress, token) => {
  const [balance, setBalance] = useState('0.0');

  // For native ETH balance
  const nativeBalance = useBalance({
    address: userAddress,
    enabled: !!userAddress && token?.symbol === 'ETH',
  });


  useEffect(() => {
    if (token?.symbol === 'ETH' && nativeBalance.isSuccess && nativeBalance.data) {
      const formattedBalance = formatUnits(nativeBalance.data.value, nativeBalance.data.decimals) * 1;
      setBalance(formattedBalance.toFixed(5));
    }
    else {
      setBalance('0.0');
    }
  }, [
    nativeBalance.isSuccess, nativeBalance.data,
    token?.symbol
  ]);

  return balance;
};

export default useGetEthBalance