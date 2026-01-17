/**
 * Chain-Specific Settings Verification Script
 * 
 * Verifies gas settings, slippage settings, timeout settings,
 * minimum amounts, and confirmation requirements per chain.
 */

const chainsData = require('../chains.json');

// Verify chain-specific settings
function verifyChainSettings(chain) {
    const issues = [];
    const warnings = [];

    // Verify gas settings
    if (!chain.gasSettings) {
        warnings.push('Gas settings not configured');
    } else {
        if (chain.gasSettings.gasLimit && chain.gasSettings.gasLimit <= 0) {
            issues.push('Invalid gas limit');
        }
    }

    // Verify slippage settings
    if (!chain.slippage) {
        warnings.push('Slippage settings not configured');
    } else {
        if (chain.slippage.default && (chain.slippage.default < 0 || chain.slippage.default > 100)) {
            issues.push('Invalid default slippage (must be 0-100)');
        }
        if (chain.slippage.min && chain.slippage.min < 0) {
            issues.push('Invalid minimum slippage');
        }
        if (chain.slippage.max && chain.slippage.max > 100) {
            issues.push('Invalid maximum slippage');
        }
        if (chain.slippage.min && chain.slippage.max && chain.slippage.min > chain.slippage.max) {
            issues.push('Minimum slippage greater than maximum');
        }
    }

    // Verify timeout settings
    if (!chain.timeouts) {
        warnings.push('Timeout settings not configured');
    } else {
        if (chain.timeouts.transactionTimeout && chain.timeouts.transactionTimeout <= 0) {
            issues.push('Invalid transaction timeout');
        }
        if (chain.timeouts.rpcTimeout && chain.timeouts.rpcTimeout <= 0) {
            issues.push('Invalid RPC timeout');
        }
        if (chain.timeouts.retryAttempts && chain.timeouts.retryAttempts < 0) {
            issues.push('Invalid retry attempts');
        }
        if (chain.timeouts.retryDelay && chain.timeouts.retryDelay < 0) {
            issues.push('Invalid retry delay');
        }
    }

    // Verify minimum amounts
    if (!chain.minimums) {
        warnings.push('Minimum amounts not configured');
    } else {
        if (chain.minimums.swap && parseFloat(chain.minimums.swap) < 0) {
            issues.push('Invalid swap minimum amount');
        }
        if (chain.minimums.referral && parseFloat(chain.minimums.referral) < 0) {
            issues.push('Invalid referral minimum amount');
        }
    }

    // Verify block time
    if (!chain.blockTime || chain.blockTime <= 0) {
        warnings.push('Block time not configured or invalid');
    }

    // Verify confirmations required
    if (chain.confirmationsRequired === undefined || chain.confirmationsRequired < 0) {
        warnings.push('Confirmations required not configured or invalid');
    }

    // Verify feature flags
    if (!chain.featureFlags) {
        warnings.push('Feature flags not configured');
    }

    return { issues, warnings };
}

// Main verification function
function verifySettings() {
    console.log('🔍 Verifying Chain-Specific Settings...\n');

    let totalIssues = 0;
    let totalWarnings = 0;
    const chainResults = [];

    chainsData.forEach(chain => {
        console.log(`\n📋 ${chain.chainName} (Chain ID: ${chain.chainId}):`);
        
        const { issues, warnings } = verifyChainSettings(chain);

        if (issues.length === 0 && warnings.length === 0) {
            console.log('  ✅ All settings valid');
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

        // Display current settings
        console.log('  📊 Current Settings:');
        if (chain.gasSettings) {
            console.log(`    Gas Limit: ${chain.gasSettings.gasLimit || 'Not set'}`);
        }
        if (chain.slippage) {
            console.log(`    Slippage: ${chain.slippage.default || 'Not set'}% (min: ${chain.slippage.min || 'Not set'}%, max: ${chain.slippage.max || 'Not set'}%)`);
        }
        if (chain.timeouts) {
            console.log(`    Transaction Timeout: ${chain.timeouts.transactionTimeout || 'Not set'}ms`);
            console.log(`    RPC Timeout: ${chain.timeouts.rpcTimeout || 'Not set'}ms`);
        }
        if (chain.minimums) {
            console.log(`    Minimum Swap: ${chain.minimums.swap || 'Not set'}`);
            console.log(`    Minimum Referral: ${chain.minimums.referral || 'Not set'}`);
        }
        console.log(`    Block Time: ${chain.blockTime || 'Not set'}s`);
        console.log(`    Confirmations Required: ${chain.confirmationsRequired || 'Not set'}`);

        chainResults.push({
            chainName: chain.chainName,
            chainId: chain.chainId,
            issues,
            warnings,
        });
    });

    console.log('\n📊 Summary:');
    console.log(`  Total Chains: ${chainsData.length}`);
    console.log(`  Total Issues: ${totalIssues} ❌`);
    console.log(`  Total Warnings: ${totalWarnings} ⚠️`);
    console.log();

    if (totalIssues === 0 && totalWarnings === 0) {
        console.log('✅ All chain-specific settings are valid!');
        return true;
    } else if (totalIssues === 0) {
        console.log('⚠️  Some settings have warnings but no critical issues.');
        return true;
    } else {
        console.log('❌ Some settings have critical issues that need to be fixed.');
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifySettings();
    process.exit(success ? 0 : 1);
}

module.exports = { verifySettings, verifyChainSettings };

