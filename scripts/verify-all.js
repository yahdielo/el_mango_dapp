/**
 * Master Verification Script
 * 
 * Runs all verification scripts and provides a comprehensive deployment readiness report.
 */

const { verifyEnvironment } = require('./verify-environment');
const { verifyContracts } = require('./verify-contracts');
const { verifyRpcEndpoints } = require('./verify-rpc');
const { verifyExplorers } = require('./verify-explorers');
const { verifySettings } = require('./verify-settings');
const { verifyFeatures } = require('./verify-features');

// Verification results
const results = {
    environment: { passed: false, error: null },
    contracts: { passed: false, error: null },
    rpc: { passed: false, error: null },
    explorers: { passed: false, error: null },
    settings: { passed: false, error: null },
    features: { passed: false, error: null },
};

// Run all verifications
async function runAllVerifications() {
    console.log('🚀 Running Complete Deployment Verification...\n');
    console.log('=' .repeat(60));
    console.log();

    // 1. Environment Variables
    console.log('1️⃣  Environment Variables Verification');
    console.log('-'.repeat(60));
    try {
        results.environment.passed = verifyEnvironment();
    } catch (error) {
        results.environment.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // 2. Contract Addresses
    console.log('2️⃣  Contract Address Verification');
    console.log('-'.repeat(60));
    try {
        results.contracts.passed = await verifyContracts();
    } catch (error) {
        results.contracts.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // 3. RPC Endpoints
    console.log('3️⃣  RPC Endpoint Verification');
    console.log('-'.repeat(60));
    try {
        results.rpc.passed = await verifyRpcEndpoints();
    } catch (error) {
        results.rpc.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // 4. Explorer URLs
    console.log('4️⃣  Explorer URL Verification');
    console.log('-'.repeat(60));
    try {
        results.explorers.passed = await verifyExplorers();
    } catch (error) {
        results.explorers.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // 5. Chain-Specific Settings
    console.log('5️⃣  Chain-Specific Settings Verification');
    console.log('-'.repeat(60));
    try {
        results.settings.passed = verifySettings();
    } catch (error) {
        results.settings.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // 6. Feature Flags
    console.log('6️⃣  Feature Flags Verification');
    console.log('-'.repeat(60));
    try {
        results.features.passed = verifyFeatures();
    } catch (error) {
        results.features.error = error.message;
        console.error('❌ Error:', error.message);
    }
    console.log();

    // Final Summary
    console.log('='.repeat(60));
    console.log('📊 FINAL DEPLOYMENT READINESS REPORT');
    console.log('='.repeat(60));
    console.log();

    const allChecks = [
        { name: 'Environment Variables', result: results.environment },
        { name: 'Contract Addresses', result: results.contracts },
        { name: 'RPC Endpoints', result: results.rpc },
        { name: 'Explorer URLs', result: results.explorers },
        { name: 'Chain Settings', result: results.settings },
        { name: 'Feature Flags', result: results.features },
    ];

    let passedCount = 0;
    let failedCount = 0;

    allChecks.forEach(check => {
        const status = check.result.passed ? '✅ PASS' : '❌ FAIL';
        const error = check.result.error ? ` (Error: ${check.result.error})` : '';
        console.log(`${status} - ${check.name}${error}`);
        
        if (check.result.passed) {
            passedCount++;
        } else {
            failedCount++;
        }
    });

    console.log();
    console.log(`Total: ${passedCount} passed, ${failedCount} failed`);
    console.log();

    const allPassed = passedCount === allChecks.length;

    if (allPassed) {
        console.log('✅ ✅ ✅ PRODUCTION READY ✅ ✅ ✅');
        console.log();
        console.log('All verification checks passed. The application is ready for deployment.');
    } else {
        console.log('⚠️  ⚠️  ⚠️  NOT PRODUCTION READY ⚠️  ⚠️  ⚠️');
        console.log();
        console.log('Some verification checks failed. Please review and fix the issues above before deploying.');
    }

    return allPassed;
}

// Run all verifications
if (require.main === module) {
    runAllVerifications()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { runAllVerifications, results };

