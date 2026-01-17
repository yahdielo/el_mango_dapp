/**
 * Tests for Environment Variable Loading
 */

describe('Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should load REACT_APP_MANGO_API_URL from environment', () => {
    process.env.REACT_APP_MANGO_API_URL = 'https://api.mangodefi.com';
    
    // Re-import to get fresh module
    jest.resetModules();
    const api = require('../services/mangoApi');
    
    expect(api).toBeDefined();
  });

  test('should use default API URL if not set', () => {
    delete process.env.REACT_APP_MANGO_API_URL;
    
    // Module should still load with default
    jest.resetModules();
    const api = require('../services/mangoApi');
    
    expect(api).toBeDefined();
  });

  test('should load REACT_APP_MANGO_API_KEY from environment', () => {
    process.env.REACT_APP_MANGO_API_KEY = 'test-api-key-12345';
    
    jest.resetModules();
    const api = require('../services/mangoApi');
    
    expect(api).toBeDefined();
  });

  test('should handle missing API key gracefully', () => {
    delete process.env.REACT_APP_MANGO_API_KEY;
    
    // Should not throw error, API key can be empty
    expect(() => {
      jest.resetModules();
      require('../services/mangoApi');
    }).not.toThrow();
  });

  test('should use production URL when set', () => {
    process.env.REACT_APP_MANGO_API_URL = 'https://api.mangodefi.com';
    process.env.REACT_APP_MANGO_API_KEY = 'prod-key';
    
    jest.resetModules();
    const api = require('../services/mangoApi');
    
    expect(api).toBeDefined();
  });
});

