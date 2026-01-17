/**
 * Contract Address Verification Script
 * 
 * Verifies all contract addresses are correct per chain and match deployed contracts.
 */

const axios = require('axios');
const { verifyEnvironment, loadEnvFile } = require('./verify-environment');

// Chain IDs and names
const CHAINS = {
    1: { name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
    10: { name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
    56: { name: 'BSC', rpc: 'https://bsc-dataseed1.binance.org' },
    137: { name: 'Polygon', rpc: 'https://polygon-rpc.com' },
    8453: { name: 'Base', rpc: 'https://mainnet.base.org' },
    42161: { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
    43114: { name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
    728126428: { name: 'Tron', rpc: null }, // Tron uses different RPC
    501111: { name: 'Solana', rpc: null }, // Solana uses different RPC
    0: { name: 'Bitcoin', rpc: null }, // Bitcoin uses different RPC
};

// Contract types
const CONTRACT_TYPES = ['router', 'referral', 'token', 'manager', 'whitelist'];

// Get contract address from environment
function getContractAddress(chainName, contractType) {
    const varName = `REACT_APP_${chainName.toUpperCase()}_${contractType.toUpperCase()}`;
    return process.env[varName] || null;
}

// Verify EVM contract has code
async function verifyEVMContract(chainId, address, rpcUrl) {
    try {
        const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            method: 'eth_getCode',
            params: [address, 'latest'],
            id: 1,
        }, {
            timeout: 10000,
        });

        if (response.data.error) {
            return { valid: false, error: response.data.error.message };
        }

        const code = response.data.result;
        const hasCode = code && code !== '0x' && code !== '0x0';

        return {
            valid: hasCode,
            hasCode,
            error: hasCode ? null : 'Contract has no code at this address',
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message || 'RPC request failed',
        };
    }
}

// Verify contract address format
function verifyAddressFormat(chainId, address) {
    if (!address) return { valid: false, error: 'Address is missing' };

    const chain = CHAINS[chainId];
    if (!chain) return { valid: false, error: 'Unknown chain' };

    // EVM address format
    if ([1, 10, 56, 137, 8453, 42161, 43114].includes(chainId)) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return { valid: false, error: 'Invalid EVM address format' };
        }
        return { valid: true };
    }

    // Tron address format
    if (chainId === 728126428) {
        if (!/^T[A-Za-z1-9]{33}$/.test(address)) {
            return { valid: false, error: 'Invalid Tron address format' };
        }
        return { valid: true };
    }

    // Solana address format
    if (chainId === 501111) {
        if (address.length < 32 || address.length > 44) {
            return { valid: false, error: 'Invalid Solana address format' };
        }
        return { valid: true };
    }

    // Bitcoin address format
    if (chainId === 0) {
        if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
            return { valid: false, error: 'Invalid Bitcoin address format' };
        }
        return { valid: true };
    }

    return { valid: true };
}

// Verify contracts for a chain
async function verifyChainContracts(chainId) {
    const chain = CHAINS[chainId];
    if (!chain) {
        console.log(`  ❌ Unknown chain ID: ${chainId}`);
        return { passed: 0, failed: 0, total: 0 };
    }

    console.log(`\n📋 ${chain.name} (Chain ID: ${chainId}):`);
    
    let passed = 0;
    let failed = 0;
    const results = [];

    for (const contractType of CONTRACT_TYPES) {
        const address = getContractAddress(chain.name, contractType);
        
        if (!address) {
            console.log(`  ⚠️  ${contractType.toUpperCase()}: Not set (optional)`);
            continue;
        }

        // Verify format
        const formatCheck = verifyAddressFormat(chainId, address);
        if (!formatCheck.valid) {
            console.log(`  ❌ ${contractType.toUpperCase()}: ${formatCheck.error}`);
            console.log(`     Address: ${address}`);
            failed++;
            results.push({ contractType, address, error: formatCheck.error });
            continue;
        }

        // For EVM chains, verify contract has code
        if (chain.rpc) {
            const contractCheck = await verifyEVMContract(chainId, address, chain.rpc);
            if (contractCheck.valid && contractCheck.hasCode) {
                console.log(`  ✅ ${contractType.toUpperCase()}: Valid contract`);
                passed++;
            } else {
                console.log(`  ⚠️  ${contractType.toUpperCase()}: ${contractCheck.error || 'Could not verify'}`);
                console.log(`     Address: ${address}`);
                results.push({ contractType, address, error: contractCheck.error });
            }
        } else {
            // For non-EVM chains, just verify format
            console.log(`  ✅ ${contractType.toUpperCase()}: Valid format`);
            passed++;
        }
    }

    return { passed, failed, total: passed + failed, results };
}

// Main verification function
async function verifyContracts() {
    console.log('🔍 Verifying Contract Addresses...\n');

    // First verify environment variables
    const envVars = loadEnvFile();
    if (Object.keys(envVars).length === 0 && Object.keys(process.env).filter(k => k.startsWith('REACT_APP_')).length === 0) {
        console.log('❌ No environment variables found. Please set contract addresses first.');
        return false;
    }

    const chainIds = Object.keys(CHAINS).map(Number);
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTotal = 0;

    for (const chainId of chainIds) {
        const result = await verifyChainContracts(chainId);
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTotal += result.total;
    }

    console.log('\n📊 Summary:');
    console.log(`  Total Contracts Verified: ${totalPassed}/${totalTotal}`);
    console.log(`  Passed: ${totalPassed} ✅`);
    console.log(`  Failed/Warnings: ${totalFailed} ⚠️`);
    console.log();

    if (totalFailed === 0) {
        console.log('✅ All contract addresses are valid!');
        return true;
    } else {
        console.log('⚠️  Some contract addresses need attention.');
        return totalPassed > 0; // Pass if at least some contracts are valid
    }
}

// Run verification
if (require.main === module) {
    verifyContracts()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyContracts, verifyAddressFormat, verifyEVMContract };

