// Mock for @reown/appkit/react
const mockCreateAppKit = jest.fn(() => ({
  open: jest.fn(),
  close: jest.fn(),
  subscribe: jest.fn(),
}));

const mockUseAppKit = jest.fn(() => ({
  open: jest.fn(),
  close: jest.fn(),
  subscribe: jest.fn(),
}));

// Support both CommonJS and ES6 imports
const mockExports = {
  __esModule: true,
  default: {
    createAppKit: mockCreateAppKit,
    useAppKit: mockUseAppKit,
  },
  createAppKit: mockCreateAppKit,
  useAppKit: mockUseAppKit,
  __mockCreateAppKit: mockCreateAppKit, // Export for test access
  __mockUseAppKit: mockUseAppKit, // Export for test access
};

module.exports = mockExports;

