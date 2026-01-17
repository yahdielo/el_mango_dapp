/**
 * Environment Variables Verification Script
 * 
 * Verifies all required environment variables are set for production deployment.
 */

const fs = require('fs');
const path = require('path');

// All required environment variables
const REQUIRED_ENV_VARS = {
    // API Configuration
    api: [
        'REACT_APP_MANGO_API_URL',
        'REACT_APP_MANGO_API_KEY',
        'REACT_APP_LAYERSWAP_API_KEY',
        'REACT_APP_LAYERSWAP_API_URL',
    ],
    // Contract Addresses per Chain
    contracts: {
        ethereum: [
            'REACT_APP_ETHEREUM_ROUTER',
            'REACT_APP_ETHEREUM_REFERRAL',
            'REACT_APP_ETHEREUM_TOKEN',
            'REACT_APP_ETHEREUM_MANAGER',
            'REACT_APP_ETHEREUM_WHITELIST',
        ],
        optimism: [
            'REACT_APP_OPTIMISM_ROUTER',
            'REACT_APP_OPTIMISM_REFERRAL',
            'REACT_APP_OPTIMISM_TOKEN',
            'REACT_APP_OPTIMISM_MANAGER',
            'REACT_APP_OPTIMISM_WHITELIST',
        ],
        bsc: [
            'REACT_APP_BSC_ROUTER',
            'REACT_APP_BSC_REFERRAL',
            'REACT_APP_BSC_TOKEN',
            'REACT_APP_BSC_MANAGER',
            'REACT_APP_BSC_WHITELIST',
        ],
        polygon: [
            'REACT_APP_POLYGON_ROUTER',
            'REACT_APP_POLYGON_REFERRAL',
            'REACT_APP_POLYGON_TOKEN',
            'REACT_APP_POLYGON_MANAGER',
            'REACT_APP_POLYGON_WHITELIST',
        ],
        base: [
            'REACT_APP_BASE_ROUTER',
            'REACT_APP_BASE_REFERRAL',
            'REACT_APP_BASE_TOKEN',
            'REACT_APP_BASE_MANAGER',
            'REACT_APP_BASE_WHITELIST',
        ],
        arbitrum: [
            'REACT_APP_ARBITRUM_ROUTER',
            'REACT_APP_ARBITRUM_REFERRAL',
            'REACT_APP_ARBITRUM_TOKEN',
            'REACT_APP_ARBITRUM_MANAGER',
            'REACT_APP_ARBITRUM_WHITELIST',
        ],
        avalanche: [
            'REACT_APP_AVALANCHE_ROUTER',
            'REACT_APP_AVALANCHE_REFERRAL',
            'REACT_APP_AVALANCHE_TOKEN',
            'REACT_APP_AVALANCHE_MANAGER',
            'REACT_APP_AVALANCHE_WHITELIST',
        ],
        tron: [
            'REACT_APP_TRON_ROUTER',
            'REACT_APP_TRON_REFERRAL',
            'REACT_APP_TRON_TOKEN',
            'REACT_APP_TRON_MANAGER',
            'REACT_APP_TRON_WHITELIST',
        ],
        solana: [
            'REACT_APP_SOLANA_ROUTER',
            'REACT_APP_SOLANA_REFERRAL',
            'REACT_APP_SOLANA_TOKEN',
            'REACT_APP_SOLANA_MANAGER',
            'REACT_APP_SOLANA_WHITELIST',
        ],
        bitcoin: [
            'REACT_APP_BITCOIN_ROUTER',
            'REACT_APP_BITCOIN_REFERRAL',
            'REACT_APP_BITCOIN_TOKEN',
            'REACT_APP_BITCOIN_MANAGER',
            'REACT_APP_BITCOIN_WHITELIST',
        ],
    },
    // RPC Endpoints (optional but recommended)
    rpc: {
        ethereum: ['REACT_APP_ETHEREUM_RPC', 'REACT_APP_ETHEREUM_RPC_FALLBACK'],
        optimism: ['REACT_APP_OPTIMISM_RPC', 'REACT_APP_OPTIMISM_RPC_FALLBACK'],
        bsc: ['REACT_APP_BSC_RPC', 'REACT_APP_BSC_RPC_FALLBACK'],
        polygon: ['REACT_APP_POLYGON_RPC', 'REACT_APP_POLYGON_RPC_FALLBACK'],
        base: ['REACT_APP_BASE_RPC', 'REACT_APP_BASE_RPC_FALLBACK'],
        arbitrum: ['REACT_APP_ARBITRUM_RPC', 'REACT_APP_ARBITRUM_RPC_FALLBACK'],
        avalanche: ['REACT_APP_AVALANCHE_RPC', 'REACT_APP_AVALANCHE_RPC_FALLBACK'],
    },
};

// Load environment variables from .env file
function loadEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.warn('⚠️  .env file not found. Checking process.env only.');
        return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            }
        }
    });

    return envVars;
}

// Check if environment variable is set
function isEnvVarSet(varName, envVars = {}) {
    const value = process.env[varName] || envVars[varName];
    return value && value.trim() !== '' && value !== 'your_api_key_here' && value !== '0x...';
}

// Verify environment variables
function verifyEnvironment() {
    console.log('🔍 Verifying Environment Variables...\n');
    
    const envVars = loadEnvFile();
    let allPassed = true;
    const results = {
        api: { passed: 0, failed: [], total: REQUIRED_ENV_VARS.api.length },
        contracts: { passed: 0, failed: [], total: 0 },
        rpc: { passed: 0, failed: [], total: 0, optional: true },
    };

    // Verify API Configuration
    console.log('📡 API Configuration:');
    REQUIRED_ENV_VARS.api.forEach(varName => {
        if (isEnvVarSet(varName, envVars)) {
            console.log(`  ✅ ${varName}`);
            results.api.passed++;
        } else {
            console.log(`  ❌ ${varName} - MISSING`);
            results.api.failed.push(varName);
            allPassed = false;
        }
    });
    console.log();

    // Verify Contract Addresses
    console.log('📝 Contract Addresses:');
    Object.entries(REQUIRED_ENV_VARS.contracts).forEach(([chain, vars]) => {
        console.log(`  ${chain.toUpperCase()}:`);
        vars.forEach(varName => {
            results.contracts.total++;
            if (isEnvVarSet(varName, envVars)) {
                console.log(`    ✅ ${varName}`);
                results.contracts.passed++;
            } else {
                console.log(`    ⚠️  ${varName} - MISSING (may be optional)`);
                results.contracts.failed.push(`${chain}:${varName}`);
            }
        });
    });
    console.log();

    // Verify RPC Endpoints (optional but recommended)
    console.log('🌐 RPC Endpoints (Optional but Recommended):');
    Object.entries(REQUIRED_ENV_VARS.rpc).forEach(([chain, vars]) => {
        console.log(`  ${chain.toUpperCase()}:`);
        vars.forEach(varName => {
            results.rpc.total++;
            if (isEnvVarSet(varName, envVars)) {
                console.log(`    ✅ ${varName}`);
                results.rpc.passed++;
            } else {
                console.log(`    ⚠️  ${varName} - MISSING (using chains.json defaults)`);
                results.rpc.failed.push(`${chain}:${varName}`);
            }
        });
    });
    console.log();

    // Summary
    console.log('📊 Summary:');
    console.log(`  API Configuration: ${results.api.passed}/${results.api.total} ✅`);
    console.log(`  Contract Addresses: ${results.contracts.passed}/${results.contracts.total} ✅`);
    console.log(`  RPC Endpoints: ${results.rpc.passed}/${results.rpc.total} (${results.rpc.optional ? 'optional' : 'required'})`);
    console.log();

    if (allPassed && results.api.passed === results.api.total) {
        console.log('✅ All required environment variables are set!');
        return true;
    } else {
        console.log('❌ Some required environment variables are missing.');
        if (results.api.failed.length > 0) {
            console.log('\n⚠️  Missing API Configuration:');
            results.api.failed.forEach(varName => {
                console.log(`  - ${varName}`);
            });
        }
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifyEnvironment();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyEnvironment, isEnvVarSet, loadEnvFile };

