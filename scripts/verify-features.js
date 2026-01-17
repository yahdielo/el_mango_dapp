/**
 * Feature Flags Verification Script
 * 
 * Verifies feature flags work per chain and tests feature availability.
 */

const chainsData = require('../chains.json');

// Expected feature flags
const EXPECTED_FEATURES = [
    'directSwap',
    'layerSwap',
    'referralSystem',
    'whitelist',
    'tokenTax',
    'crossChainSync',
    'batchOperations',
];

// Verify feature flags for a chain
function verifyChainFeatures(chain) {
    const issues = [];
    const warnings = [];

    if (!chain.featureFlags) {
        issues.push('Feature flags not configured');
        return { issues, warnings, features: {} };
    }

    const features = chain.featureFlags;
    const missingFeatures = [];

    // Check for expected features
    EXPECTED_FEATURES.forEach(feature => {
        if (features[feature] === undefined) {
            missingFeatures.push(feature);
        }
    });

    if (missingFeatures.length > 0) {
        warnings.push(`Missing feature flags: ${missingFeatures.join(', ')}`);
    }

    // Verify feature combinations make sense
    if (chain.type === 'SOLANA' || chain.type === 'BITCOIN') {
        if (features.directSwap === true) {
            issues.push('Non-EVM chains should not have directSwap enabled');
        }
        if (features.layerSwap !== true) {
            issues.push('Solana/Bitcoin should have layerSwap enabled');
        }
    }

    if (chain.type === 'TRON') {
        if (features.directSwap === true) {
            warnings.push('Tron may not support directSwap (verify implementation)');
        }
    }

    // Verify referral system availability
    if (features.referralSystem === true) {
        // Check if referral contract is configured
        const hasReferralContract = chain.contracts?.referral !== null;
        if (!hasReferralContract) {
            warnings.push('Referral system enabled but referral contract not configured');
        }
    }

    // Verify whitelist availability
    if (features.whitelist === true) {
        const hasWhitelistContract = chain.contracts?.whitelist !== null;
        if (!hasWhitelistContract) {
            warnings.push('Whitelist enabled but whitelist contract not configured');
        }
    }

    return { issues, warnings, features };
}

// Main verification function
function verifyFeatures() {
    console.log('🔍 Verifying Feature Flags...\n');

    let totalIssues = 0;
    let totalWarnings = 0;
    const chainResults = [];

    chainsData.forEach(chain => {
        console.log(`\n📋 ${chain.chainName} (Chain ID: ${chain.chainId}, Type: ${chain.type}):`);
        
        const { issues, warnings, features } = verifyChainFeatures(chain);

        if (issues.length === 0 && warnings.length === 0) {
            console.log('  ✅ All feature flags valid');
        } else {
            if (issues.length > 0) {
                console.log('  ❌ Issues:');
                issues.forEach(issue => {
                    console.log(`    - ${issue}`);
                });
                totalIssues += issues.length;
            }

            if (warnings.length > 0) {
                console.log('  ⚠️  Warnings:');
                warnings.forEach(warning => {
                    console.log(`    - ${warning}`);
                });
                totalWarnings += warnings.length;
            }
        }

        // Display current feature flags
        console.log('  🚩 Feature Flags:');
        EXPECTED_FEATURES.forEach(feature => {
            const value = features[feature];
            const status = value === true ? '✅' : value === false ? '❌' : '⚠️';
            console.log(`    ${status} ${feature}: ${value !== undefined ? value : 'Not set'}`);
        });

        chainResults.push({
            chainName: chain.chainName,
            chainId: chain.chainId,
            type: chain.type,
            issues,
            warnings,
            features,
        });
    });

    // Summary by feature
    console.log('\n📊 Feature Availability Summary:');
    EXPECTED_FEATURES.forEach(feature => {
        const enabledChains = chainResults.filter(
            result => result.features[feature] === true
        ).map(result => result.chainName);
        
        const disabledChains = chainResults.filter(
            result => result.features[feature] === false
        ).map(result => result.chainName);

        console.log(`\n  ${feature}:`);
        console.log(`    Enabled: ${enabledChains.length} chains (${enabledChains.join(', ') || 'None'})`);
        console.log(`    Disabled: ${disabledChains.length} chains (${disabledChains.join(', ') || 'None'})`);
    });

    console.log('\n📊 Summary:');
    console.log(`  Total Chains: ${chainsData.length}`);
    console.log(`  Total Issues: ${totalIssues} ❌`);
    console.log(`  Total Warnings: ${totalWarnings} ⚠️`);
    console.log();

    if (totalIssues === 0 && totalWarnings === 0) {
        console.log('✅ All feature flags are valid!');
        return true;
    } else if (totalIssues === 0) {
        console.log('⚠️  Some feature flags have warnings but no critical issues.');
        return true;
    } else {
        console.log('❌ Some feature flags have critical issues that need to be fixed.');
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifyFeatures();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyFeatures, verifyChainFeatures };

