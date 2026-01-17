// Import chains.json - now in src/ directory for Create React App compatibility
// Path: src/services/ -> ../ -> src/ -> chains.json
import chainsData from '../chains.json';

/**
 * Chain Configuration Service
 * Provides centralized access to chain configurations
 */
class ChainConfigService {
  constructor() {
    this.chains = chainsData;
    this.contractAddresses = this.loadContractAddresses();
  }

  /**
   * Load contract addresses from environment or defaults
   */
  loadContractAddresses() {
    return {
      1: { // Ethereum
        router: process.env.REACT_APP_ETHEREUM_ROUTER || null,
        referral: process.env.REACT_APP_ETHEREUM_REFERRAL || null,
        token: process.env.REACT_APP_ETHEREUM_TOKEN || null,
        manager: process.env.REACT_APP_ETHEREUM_MANAGER || null,
        whitelist: process.env.REACT_APP_ETHEREUM_WHITELIST || null,
      },
      10: { // Optimism
        router: process.env.REACT_APP_OPTIMISM_ROUTER || null,
        referral: process.env.REACT_APP_OPTIMISM_REFERRAL || null,
        token: process.env.REACT_APP_OPTIMISM_TOKEN || null,
        manager: process.env.REACT_APP_OPTIMISM_MANAGER || null,
        whitelist: process.env.REACT_APP_OPTIMISM_WHITELIST || null,
      },
      56: { // BSC
        router: process.env.REACT_APP_BSC_ROUTER || null,
        referral: process.env.REACT_APP_BSC_REFERRAL || null,
        token: process.env.REACT_APP_BSC_TOKEN || null,
        manager: process.env.REACT_APP_BSC_MANAGER || null,
        whitelist: process.env.REACT_APP_BSC_WHITELIST || null,
      },
      137: { // Polygon
        router: process.env.REACT_APP_POLYGON_ROUTER || null,
        referral: process.env.REACT_APP_POLYGON_REFERRAL || null,
        token: process.env.REACT_APP_POLYGON_TOKEN || null,
        manager: process.env.REACT_APP_POLYGON_MANAGER || null,
        whitelist: process.env.REACT_APP_POLYGON_WHITELIST || null,
      },
      8453: { // Base
        router: process.env.REACT_APP_BASE_ROUTER || null,
        referral: process.env.REACT_APP_BASE_REFERRAL || null,
        token: process.env.REACT_APP_BASE_TOKEN || null,
        manager: process.env.REACT_APP_BASE_MANAGER || null,
        whitelist: process.env.REACT_APP_BASE_WHITELIST || null,
      },
      42161: { // Arbitrum
        router: process.env.REACT_APP_ARBITRUM_ROUTER || null,
        referral: process.env.REACT_APP_ARBITRUM_REFERRAL || null,
        token: process.env.REACT_APP_ARBITRUM_TOKEN || null,
        manager: process.env.REACT_APP_ARBITRUM_MANAGER || null,
        whitelist: process.env.REACT_APP_ARBITRUM_WHITELIST || null,
      },
      43114: { // Avalanche
        router: process.env.REACT_APP_AVALANCHE_ROUTER || null,
        referral: process.env.REACT_APP_AVALANCHE_REFERRAL || null,
        token: process.env.REACT_APP_AVALANCHE_TOKEN || null,
        manager: process.env.REACT_APP_AVALANCHE_MANAGER || null,
        whitelist: process.env.REACT_APP_AVALANCHE_WHITELIST || null,
      },
      728126428: { // Tron
        router: process.env.REACT_APP_TRON_ROUTER || null,
        referral: process.env.REACT_APP_TRON_REFERRAL || null,
        token: process.env.REACT_APP_TRON_TOKEN || null,
        manager: process.env.REACT_APP_TRON_MANAGER || null,
        whitelist: process.env.REACT_APP_TRON_WHITELIST || null,
      },
      501111: { // Solana
        router: process.env.REACT_APP_SOLANA_ROUTER || null,
        referral: process.env.REACT_APP_SOLANA_REFERRAL || null,
        token: process.env.REACT_APP_SOLANA_TOKEN || null,
        manager: process.env.REACT_APP_SOLANA_MANAGER || null,
        whitelist: process.env.REACT_APP_SOLANA_WHITELIST || null,
      },
      0: { // Bitcoin
        router: process.env.REACT_APP_BITCOIN_ROUTER || null,
        referral: process.env.REACT_APP_BITCOIN_REFERRAL || null,
        token: process.env.REACT_APP_BITCOIN_TOKEN || null,
        manager: process.env.REACT_APP_BITCOIN_MANAGER || null,
        whitelist: process.env.REACT_APP_BITCOIN_WHITELIST || null,
      },
    };
  }

  /**
   * Get all chains
   */
  getAllChains() {
    return this.chains;
  }

  /**
   * Get EVM chains only
   */
  getEVMChains() {
    return this.chains.filter(c => c.type === 'EVM' || !c.type);
  }

  /**
   * Get EVM chains with referral system support
   * Returns all 7 EVM chains that support referrals (even if contracts not yet deployed)
   * @returns {Array} Array of chain objects with referral system enabled
   */
  getEVMChainsWithReferralSupport() {
    return this.chains.filter(c => {
      const chainId = parseInt(c.chainId);
      const isEVM = c.type === 'EVM' || !c.type;
      const hasReferralSupport = this.getFeatureFlags(chainId).referralSystem === true;
      return isEVM && hasReferralSupport;
    });
  }

  /**
   * Get chain by ID
   */
  getChain(chainId) {
    return this.chains.find(c => c.chainId === String(chainId));
  }

  /**
   * Get contract address for chain
   * Returns null if contract is not deployed (this is acceptable for undeployed chains)
   * @param {number} chainId - Chain ID
   * @param {string} contractType - Contract type ('router', 'referral', 'token', 'manager', 'whitelist')
   * @returns {string|null} Contract address or null if not deployed
   */
  getContractAddress(chainId, contractType) {
    const addresses = this.contractAddresses[chainId];
    if (addresses && addresses[contractType]) {
      return addresses[contractType];
    }
    // Fallback to chains.json contracts
    const chain = this.getChain(chainId);
    return chain?.contracts?.[contractType] || null;
  }

  /**
   * Check if referral contract is deployed for a chain
   * @param {number} chainId - Chain ID
   * @returns {boolean} True if referral contract address exists
   */
  isReferralContractDeployed(chainId) {
    const referralAddress = this.getContractAddress(chainId, 'referral');
    return referralAddress !== null && referralAddress !== undefined && referralAddress !== '';
  }

  /**
   * Get block explorer URL
   */
  getExplorerUrl(chainId, txHash) {
    const chain = this.getChain(chainId);
    if (!chain?.blockExplorers?.[0]) {
      return `https://explorer.chain/${txHash}`;
    }
    return `${chain.blockExplorers[0].url}/tx/${txHash}`;
  }

  /**
   * Check if chain supports direct swaps
   */
  supportsDirectSwap(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return false;
    return chain.featureFlags?.directSwap === true || 
           chain.type === 'EVM' || 
           chain.type === 'TRON';
  }

  /**
   * Check if chain requires LayerSwap
   */
  requiresLayerSwap(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return false;
    return chain.featureFlags?.layerSwap === true || 
           chain.bridge === 'LayerSwap';
  }

  /**
   * Get chain environment variable name
   */
  getChainEnvName(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return '';
    return chain.chainName.toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Get RPC URLs for chain (with fallbacks)
   */
  getRpcUrls(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return [];
    
    const envRpc = process.env[`REACT_APP_${this.getChainEnvName(chainId)}_RPC`];
    if (envRpc) {
      return [envRpc, ...(chain.rpcUrls || [])];
    }
    return chain.rpcUrls || [];
  }

  /**
   * Get chain-specific gas settings
   */
  getGasSettings(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) {
      return {
        gasLimit: 500000,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasPrice: null,
      };
    }

    // Use chain.json gasSettings if available
    if (chain.gasSettings) {
      return {
        gasLimit: chain.gasSettings.gasLimit || 500000,
        maxFeePerGas: chain.gasSettings.maxFeePerGas || null,
        maxPriorityFeePerGas: chain.gasSettings.maxPriorityFeePerGas || null,
        gasPrice: chain.gasSettings.gasPrice || null,
      };
    }

    // Fallback defaults
    return {
      gasLimit: 500000,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
    };
  }

  /**
   * Get chain-specific slippage tolerance
   */
  getSlippageTolerance(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) {
      return {
        default: 0.5,
        min: 0.1,
        max: 5.0,
      };
    }

    // Use chain.json slippage if available
    if (chain.slippage) {
      return {
        default: chain.slippage.default || 0.5,
        min: chain.slippage.min || 0.1,
        max: chain.slippage.max || 5.0,
      };
    }

    // Fallback defaults
    return {
      default: 0.5,
      min: 0.1,
      max: 5.0,
    };
  }

  /**
   * Get chain-specific timeout settings
   */
  getTimeoutSettings(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) {
      return {
        transactionTimeout: 300000,
        rpcTimeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000,
      };
    }

    // Use chain.json timeouts if available
    if (chain.timeouts) {
      return {
        transactionTimeout: chain.timeouts.transactionTimeout || 300000,
        rpcTimeout: chain.timeouts.rpcTimeout || 10000,
        retryAttempts: chain.timeouts.retryAttempts || 3,
        retryDelay: chain.timeouts.retryDelay || 1000,
      };
    }

    // Fallback defaults
    return {
      transactionTimeout: 300000,
      rpcTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  }

  /**
   * Get chain-specific minimum amounts
   */
  getMinimumAmounts(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) {
      return {
        swap: '0.001',
        referral: '0.0001',
      };
    }

    // Use chain.json minimums if available
    if (chain.minimums) {
      return {
        swap: chain.minimums.swap || '0.001',
        referral: chain.minimums.referral || '0.0001',
      };
    }

    // Fallback defaults
    return {
      swap: '0.001',
      referral: '0.0001',
    };
  }

  /**
   * Get chain-specific block time (in seconds)
   */
  getBlockTime(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return 2;
    return chain.blockTime || 2;
  }

  /**
   * Get chain-specific confirmation requirements
   */
  getConfirmationsRequired(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return 1;
    return chain.confirmationsRequired || 1;
  }

  /**
   * Validate address format for chain
   */
  validateAddress(chainId, address) {
    const chain = this.getChain(chainId);
    
    if (!chain) return false;
    if (!address) return false;

    // Tron addresses start with T and are 34 chars
    if (chain.type === 'TRON') {
      return /^T[A-Za-z1-9]{33}$/.test(address);
    }

    // EVM addresses are 0x followed by 40 hex chars
    if (chain.type === 'EVM' || !chain.type) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Solana addresses are base58, 32-44 chars
    if (chain.type === 'SOLANA') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }

    // Bitcoin addresses vary by type
    if (chain.type === 'BITCOIN') {
      // Legacy (P2PKH): starts with 1, 25-34 chars
      // SegWit (P2SH): starts with 3, 25-34 chars
      // Bech32 (P2WPKH/P2WSH): starts with bc1, 39-59 chars
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
    }

    return false;
  }

  /**
   * Get chain-specific feature flags
   */
  getFeatureFlags(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) return {};

    // Use chain.json featureFlags if available
    if (chain.featureFlags) {
      return {
        directSwap: chain.featureFlags.directSwap || false,
        layerSwap: chain.featureFlags.layerSwap || false,
        referralSystem: chain.featureFlags.referralSystem || false,
        whitelist: chain.featureFlags.whitelist || false,
        tokenTax: chain.featureFlags.tokenTax || false,
        crossChainSync: chain.featureFlags.crossChainSync || false,
        batchOperations: chain.featureFlags.batchOperations || false,
      };
    }

    // Fallback based on chain type
    return {
      directSwap: this.supportsDirectSwap(chainId),
      layerSwap: this.requiresLayerSwap(chainId),
      referralSystem: chain.type === 'EVM' || chain.type === 'TRON',
      whitelist: chain.type === 'EVM',
      tokenTax: chain.type === 'EVM',
      crossChainSync: true,
      batchOperations: chain.type === 'EVM',
    };
  }

  /**
   * Get chain-specific error messages
   */
  getErrorMessage(chainId, errorType) {
    const chain = this.getChain(chainId);
    const chainName = chain?.chainName || 'Unknown Chain';

    const messages = {
      networkError: `Network error on ${chainName}. Please check your connection.`,
      transactionFailed: `Transaction failed on ${chainName}. Please try again.`,
      insufficientBalance: `Insufficient balance on ${chainName}.`,
      userRejected: `Transaction rejected by user on ${chainName}.`,
      timeout: `Transaction timeout on ${chainName}. Please try again.`,
      invalidAddress: `Invalid address format for ${chainName}.`,
      rpcError: `RPC error on ${chainName}. Please try again later.`,
      unsupportedChain: `${chainName} is not supported.`,
      contractNotFound: `Contract not found on ${chainName}.`,
      gasEstimationFailed: `Gas estimation failed on ${chainName}.`,
    };

    return messages[errorType] || `Error on ${chainName}`;
  }
}

export default new ChainConfigService();

