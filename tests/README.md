# Frontend Testing Guide

**Last Updated**: December 27, 2025

## Overview

This directory contains comprehensive tests for the Mango DeFi frontend application, including unit tests, integration tests, and E2E tests.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── user-flows.spec.js
│   └── playwright.config.js
└── integration/            # Integration tests
    └── api-integration.test.js

src/
├── components/
│   └── __tests__/          # Component unit tests
├── hooks/
│   └── __tests__/          # Hook unit tests
└── services/
    └── __tests__/          # Service unit tests
```

## Running Tests

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### E2E Tests

```bash
# Install Playwright (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run E2E tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/user-flows.spec.js
```

## Test Coverage

### Target Coverage
- **Components**: >70% coverage
- **Hooks**: >80% coverage
- **Services**: >85% coverage
- **Overall**: >70% coverage

### Current Coverage
Run `npm run test:coverage` to see current coverage report.

## Writing Tests

### Component Tests

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

test('should render component', () => {
  render(<MyComponent />);
  expect(screen.getByText(/expected text/i)).toBeInTheDocument();
});
```

### Hook Tests

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

test('should return expected data', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  expect(result.current.data).toBeDefined();
});
```

### Service Tests

```javascript
import { myService } from '../myService';

jest.mock('axios');

test('should call API correctly', async () => {
  const mockData = { success: true };
  axios.get.mockResolvedValue({ data: mockData });
  
  const result = await myService.getData();
  expect(result).toEqual(mockData);
});
```

## Mocking

### Wallet Connection
The `setupTests.js` file mocks wagmi hooks. You can override in individual tests:

```javascript
import { useAccount } from 'wagmi';

useAccount.mockReturnValue({
  address: '0x1234...',
  isConnected: true,
});
```

### API Calls
Mock the API service modules:

```javascript
jest.mock('../../services/mangoApi');

referralApi.getReferralChain.mockResolvedValue(mockData);
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Test what users see and do
   - Avoid testing internal implementation details

2. **Use Descriptive Test Names**
   - `should display error when API call fails`
   - `should update referral when address changes`

3. **Keep Tests Isolated**
   - Each test should be independent
   - Clean up mocks between tests

4. **Test Edge Cases**
   - Missing data
   - Error states
   - Loading states
   - Empty states

5. **Use waitFor for Async Operations**
   ```javascript
   await waitFor(() => {
     expect(result.current.loading).toBe(false);
   });
   ```

## Troubleshooting

### Tests Fail to Run
- Check that all dependencies are installed: `npm install`
- Verify Node.js version matches package.json requirements

### Mock Issues
- Ensure mocks are reset between tests: `jest.clearAllMocks()`
- Check mock setup in `setupTests.js`

### Coverage Issues
- Run `npm run test:coverage` to see detailed coverage report
- Focus on increasing coverage for critical paths first

## CI/CD Integration

Tests run automatically in CI:
- Unit tests: Run on every commit
- Coverage: Must meet threshold (70%)
- E2E tests: Run on pull requests

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)

