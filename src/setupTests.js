// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CSS Reset for test environment
// Ensures consistent styling across different test environments
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* CSS Reset for Test Environment */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Reset Bootstrap defaults that might interfere with tests */
    button, input, select, textarea {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }
    
    /* Ensure consistent button styling */
    button {
      cursor: pointer;
      border: none;
      background: transparent;
    }
    
    /* Reset form elements */
    input, textarea, select {
      border: 1px solid #ccc;
      padding: 0.5rem;
    }
  `;
  document.head.appendChild(style);
}

// Polyfill for TextEncoder/TextDecoder (required by viem and other libraries)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.REACT_APP_MANGO_API_URL = process.env.REACT_APP_MANGO_API_URL || 'http://localhost:3000';
process.env.REACT_APP_MANGO_API_KEY = process.env.REACT_APP_MANGO_API_KEY || 'test-api-key';

// Mock wagmi hooks - ensure all hooks return proper object structures
jest.mock('wagmi', () => {
  const mockUseAccount = jest.fn(() => ({ 
    address: '0x1234567890123456789012345678901234567890', 
    isConnected: true,
    chain: { id: 8453 },
    connector: null,
  }));
  
  const mockUseReadContract = jest.fn(() => ({
    data: null,
    isError: false,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }));
  
  const mockUseWaitForTransactionReceipt = jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }));
  
  const mockUseWriteContract = jest.fn(() => ({
    writeContract: jest.fn(),
    writeContractAsync: jest.fn(),
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
  }));
  
  const mockUsePublicClient = jest.fn(() => ({
    getTransactionReceipt: jest.fn(),
    getTransaction: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
  }));
  
  return {
    useAccount: mockUseAccount,
    useChainId: jest.fn(() => 8453),
    useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
    useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
    useBalance: jest.fn(() => ({ 
      data: { 
        formatted: '1.0', 
        value: BigInt('1000000000000000000'),
        decimals: 18,
        symbol: 'ETH',
      },
      isError: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    useSwitchChain: jest.fn(() => ({ switchChain: jest.fn() })),
    useReadContract: mockUseReadContract,
    useWriteContract: mockUseWriteContract,
    useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
    usePublicClient: mockUsePublicClient,
    createConfig: jest.fn(),
    WagmiProvider: ({ children }) => children,
    // Export mocks for test access
    __mockUseAccount: mockUseAccount,
    __mockUseReadContract: mockUseReadContract,
    __mockUseWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
    __mockUseWriteContract: mockUseWriteContract,
    __mockUsePublicClient: mockUsePublicClient,
  };
});

// Mocks for @reown/appkit - use factory functions with virtual: true to avoid module resolution issues
jest.mock('@reown/appkit/react', () => require('./__mocks__/reown-appkit-react.js'), { virtual: true });
jest.mock('@reown/appkit/networks', () => require('./__mocks__/reown-appkit-networks.js'), { virtual: true });
jest.mock('@reown/appkit-adapter-wagmi', () => require('./__mocks__/reown-appkit-adapter-wagmi.js'), { virtual: true });

// Mock mangoApi with proper structure
jest.mock('./services/mangoApi', () => {
  const mockTronApi = {
    linkTronAddress: jest.fn(),
    getTronAddress: jest.fn(),
    getEVMAddressFromTron: jest.fn(),
    validateTronAddress: jest.fn(),
    getUserAddressMappings: jest.fn(),
    buildSwapTransaction: jest.fn(),
    signAndExecuteTronSwap: jest.fn(),
    getTransactionStatus: jest.fn(),
  };
  
  const mockMangoApi = {
    referral: {
      getReferralChain: jest.fn(),
      getReferralStats: jest.fn(),
    },
    whitelist: {
      checkWhitelistStatus: jest.fn(),
    },
    chain: {
      getChain: jest.fn(),
      validateAddress: jest.fn(),
    },
    swap: {
      executeSwap: jest.fn(),
    },
    tron: mockTronApi,
    layerSwap: {
      getRoutes: jest.fn(),
    },
  };
  
  return {
    __esModule: true,
    mangoApi: mockMangoApi, // Named export
    default: mockMangoApi, // Default export
  };
});

// Mock axios to avoid ESM import issues
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  
  return {
    __esModule: true,
    default: {
      ...mockAxiosInstance,
      create: jest.fn(() => mockAxiosInstance),
    },
    ...mockAxiosInstance,
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Suppress console errors in tests unless needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Add BigInt serializer for Jest (fixes "Do not know how to serialize a BigInt" errors)
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}