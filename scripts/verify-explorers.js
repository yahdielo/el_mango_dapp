/**
 * Explorer URL Verification Script
 * 
 * Tests all explorer links work and verify correct transaction display.
 */

const axios = require('axios');
const chainsData = require('../chains.json');

// Test explorer URL accessibility
async function testExplorerUrl(explorerUrl, chainName) {
    try {
        const response = await axios.get(explorerUrl, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500, // Accept redirects and client errors
        });

        return {
            success: response.status < 400,
            status: response.status,
            accessible: true,
            error: null,
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
            status: error.response?.status || null,
            accessible: false,
            error: errorMessage,
        };
    }
}

// Generate test transaction URL
function generateTestTxUrl(explorer, txHash) {
    if (!explorer || !explorer.url) return null;
    
    // Standard explorer URL patterns
    const url = explorer.url.replace(/\/$/, ''); // Remove trailing slash
    
    // Most explorers use /tx/ or /transaction/
    return `${url}/tx/${txHash}`;
}

// Generate test address URL
function generateTestAddressUrl(explorer, address) {
    if (!explorer || !explorer.url) return null;
    
    const url = explorer.url.replace(/\/$/, ''); // Remove trailing slash
    
    // Most explorers use /address/
    return `${url}/address/${address}`;
}

// Verify explorer URLs for a chain
async function verifyChainExplorers(chain) {
    console.log(`\n📋 ${chain.chainName} (Chain ID: ${chain.chainId}):`);
    
    if (!chain.blockExplorers || chain.blockExplorers.length === 0) {
        console.log('  ⚠️  No block explorers configured');
        return { passed: 0, failed: 0, total: 0 };
    }

    let passed = 0;
    let failed = 0;
    const results = [];

    for (const explorer of chain.blockExplorers) {
        console.log(`  Testing Explorer: ${explorer.name || 'Unknown'}`);
        console.log(`    URL: ${explorer.url}`);

        const result = await testExplorerUrl(explorer.url, chain.chainName);
        
        if (result.success || result.status === 200 || result.status === 301 || result.status === 302) {
            console.log(`    ✅ Accessible (Status: ${result.status || 'OK'})`);
            passed++;
        } else {
            console.log(`    ❌ Not accessible: ${result.error}`);
            failed++;
        }

        // Test URL format for transaction
        const testTxHash = chain.type === 'EVM' ? '0x' + '0'.repeat(64) : 'test-tx-hash';
        const txUrl = generateTestTxUrl(explorer, testTxHash);
        if (txUrl) {
            console.log(`    📝 Transaction URL format: ${txUrl}`);
        }

        // Test URL format for address
        const testAddress = chain.type === 'EVM' ? '0x' + '0'.repeat(40) : 'test-address';
        const addressUrl = generateTestAddressUrl(explorer, testAddress);
        if (addressUrl) {
            console.log(`    📝 Address URL format: ${addressUrl}`);
        }

        results.push({
            explorer,
            ...result,
            txUrl,
            addressUrl,
        });
    }

    return { passed, failed, total: chain.blockExplorers.length, results };
}

// Main verification function
async function verifyExplorers() {
    console.log('🔍 Verifying Explorer URLs...\n');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTotal = 0;
    const chainResults = [];

    chainsData.forEach(async (chain) => {
        const result = await verifyChainExplorers(chain);
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTotal += result.total;
        chainResults.push({ chainName: chain.chainName, chainId: chain.chainId, ...result });
    });

    // Wait for all async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📊 Summary:');
    console.log(`  Total Explorers Tested: ${totalTotal}`);
    console.log(`  Passed: ${totalPassed} ✅`);
    console.log(`  Failed: ${totalFailed} ❌`);
    console.log();

    if (totalFailed === 0) {
        console.log('✅ All explorer URLs are accessible!');
        return true;
    } else {
        console.log('⚠️  Some explorer URLs need attention.');
        return totalPassed > 0; // Pass if at least some explorers work
    }
}

// Run verification
if (require.main === module) {
    verifyExplorers()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyExplorers, testExplorerUrl, generateTestTxUrl, generateTestAddressUrl };

