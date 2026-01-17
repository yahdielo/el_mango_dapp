module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
    // Map @reown/appkit modules to their mock files
    '^@reown/appkit/react$': '<rootDir>/src/__mocks__/reown-appkit-react.js',
    '^@reown/appkit/networks$': '<rootDir>/src/__mocks__/reown-appkit-networks.js',
    '^@reown/appkit-adapter-wagmi$': '<rootDir>/src/__mocks__/reown-appkit-adapter-wagmi.js',
    // Map react-router-dom to mock file
    '^react-router-dom$': '<rootDir>/src/__mocks__/react-router-dom.js',
    // Map viem/chains to mock file to handle ESM imports
    '^viem/chains$': '<rootDir>/src/__mocks__/viem/chains.js',
  },
  // Ensure mocks are automatically used when jest.mock() is called without a factory
  automock: false,
  transformIgnorePatterns: [
    'node_modules/(?!(wagmi|@reown|viem|@tanstack|axios|ox)/)',
  ],
  // Transform TypeScript files in node_modules for packages that use ESM
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['react-app'] }],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx}',
  ],
  moduleDirectories: ['node_modules', 'src'],
  // Add custom serializer for BigInt to prevent serialization errors
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

