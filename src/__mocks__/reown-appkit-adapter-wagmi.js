// Mock for @reown/appkit-adapter-wagmi
const mockWagmiAdapter = jest.fn(function WagmiAdapter(config) {
  this.wagmiConfig = {
    chains: config.networks || [],
  };
  return this;
});

// Support both CommonJS and ES6 imports
const mockExports = {
  __esModule: true,
  default: {
    WagmiAdapter: mockWagmiAdapter,
  },
  WagmiAdapter: mockWagmiAdapter,
};

module.exports = mockExports;

