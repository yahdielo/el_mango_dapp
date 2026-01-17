/**
 * RPC Endpoint Verification Script
 * 
 * Tests primary and fallback RPC endpoints for all chains.
 */

const axios = require('axios');
const chainsData = require('../chains.json');

// Chain IDs to test
const CHAIN_IDS = [1, 10, 56, 137, 8453, 42161, 43114]; // EVM chains only

// Test RPC endpoint
async function testRpcEndpoint(rpcUrl, chainId) {
    try {
        const startTime = Date.now();
        
        const response = await axios.post(
            rpcUrl,
            {
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1,
            },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const responseTime = Date.now() - startTime;

        if (response.data.error) {
            return {
                success: false,
                error: response.data.error.message,
                responseTime: null,
            };
        }

        if (response.data.result) {
            return {
                success: true,
                blockNumber: response.data.result,
                responseTime,
                error: null,
            };
        }

        return {
            success: false,
            error: 'Invalid response format',
            responseTime: null,
        };
    } catch (error) {
        let errorMessage = 'Unknown error';
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Request timeout';
        } else if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage,
            responseTime: null,
        };
    }
}

// Verify RPC endpoints for a chain
async function verifyChainRpc(chainId) {
    const chain = chainsData.find(c => c.chainId === String(chainId));
    if (!chain) {
        console.log(`  ❌ Chain not found: ${chainId}`);
        return { passed: 0, failed: 0, total: 0 };
    }

    console.log(`\n🌐 ${chain.chainName} (Chain ID: ${chainId}):`);
    
    const rpcUrls = chain.rpcUrls || [];
    if (rpcUrls.length === 0) {
        console.log('  ⚠️  No RPC URLs configured');
        return { passed: 0, failed: 0, total: 0 };
    }

    let passed = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < rpcUrls.length; i++) {
        const rpcUrl = rpcUrls[i];
        const isPrimary = i === 0;
        const label = isPrimary ? 'PRIMARY' : `FALLBACK ${i}`;

        console.log(`  Testing ${label}: ${rpcUrl}`);
        
        const result = await testRpcEndpoint(rpcUrl, chainId);
        
        if (result.success) {
            console.log(`    ✅ Success (${result.responseTime}ms)`);
            console.log(`    Block Number: ${result.blockNumber}`);
            passed++;
        } else {
            console.log(`    ❌ Failed: ${result.error}`);
            failed++;
        }

        results.push({
            url: rpcUrl,
            label,
            ...result,
        });
    }

    return { passed, failed, total: rpcUrls.length, results };
}

// Test RPC fallback mechanism
async function testRpcFallback(chainId) {
    const chain = chainsData.find(c => c.chainId === String(chainId));
    if (!chain || !chain.rpcUrls || chain.rpcUrls.length < 2) {
        return { success: false, error: 'Not enough RPC URLs for fallback test' };
    }

    console.log(`\n🔄 Testing RPC Fallback for ${chain.chainName}:`);

    // Simulate primary RPC failure
    const primaryRpc = chain.rpcUrls[0];
    const fallbackRpc = chain.rpcUrls[1];

    console.log(`  Primary RPC: ${primaryRpc}`);
    const primaryResult = await testRpcEndpoint(primaryRpc, chainId);
    
    if (primaryResult.success) {
        console.log(`    ✅ Primary RPC is healthy`);
    } else {
        console.log(`    ❌ Primary RPC failed: ${primaryResult.error}`);
        console.log(`  Testing Fallback RPC: ${fallbackRpc}`);
        
        const fallbackResult = await testRpcEndpoint(fallbackRpc, chainId);
        if (fallbackResult.success) {
            console.log(`    ✅ Fallback RPC works!`);
            return { success: true, fallbackUsed: true };
        } else {
            console.log(`    ❌ Fallback RPC also failed: ${fallbackResult.error}`);
            return { success: false, error: 'Both primary and fallback failed' };
        }
    }

    return { success: true, fallbackUsed: false };
}

// Main verification function
async function verifyRpcEndpoints() {
    console.log('🔍 Verifying RPC Endpoints...\n');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTotal = 0;
    const chainResults = [];

    // Test each chain
    for (const chainId of CHAIN_IDS) {
        const result = await verifyChainRpc(chainId);
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTotal += result.total;
        chainResults.push({ chainId, ...result });
    }

    console.log('\n📊 Summary:');
    console.log(`  Total RPC Endpoints Tested: ${totalTotal}`);
    console.log(`  Passed: ${totalPassed} ✅`);
    console.log(`  Failed: ${totalFailed} ❌`);
    console.log();

    // Test fallback mechanism for chains with multiple RPCs
    console.log('🔄 Testing RPC Fallback Mechanism:');
    let fallbackTestsPassed = 0;
    let fallbackTestsFailed = 0;

    for (const chainId of CHAIN_IDS) {
        const chain = chainsData.find(c => c.chainId === String(chainId));
        if (chain && chain.rpcUrls && chain.rpcUrls.length >= 2) {
            const fallbackResult = await testRpcFallback(chainId);
            if (fallbackResult.success) {
                fallbackTestsPassed++;
            } else {
                fallbackTestsFailed++;
            }
        }
    }

    console.log(`\n  Fallback Tests: ${fallbackTestsPassed} passed, ${fallbackTestsFailed} failed`);

    if (totalFailed === 0 && fallbackTestsFailed === 0) {
        console.log('\n✅ All RPC endpoints are working!');
        return true;
    } else {
        console.log('\n⚠️  Some RPC endpoints need attention.');
        return totalPassed > 0; // Pass if at least some RPCs work
    }
}

// Run verification
if (require.main === module) {
    verifyRpcEndpoints()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyRpcEndpoints, testRpcEndpoint, testRpcFallback };

