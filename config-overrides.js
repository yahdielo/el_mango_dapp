const webpack = require('webpack');
module.exports = function override(config, env) {
    // Disable ESLint during production builds to suppress warnings
    if (env === 'production') {
        const eslintPluginIndex = config.plugins.findIndex(plugin => 
            plugin.constructor && plugin.constructor.name === 'ESLintWebpackPlugin'
        );
        if (eslintPluginIndex !== -1) {
            config.plugins[eslintPluginIndex].options.failOnError = false;
            config.plugins[eslintPluginIndex].options.failOnWarning = false;
        }
    }

    config.resolve.fallback = {
        url: require.resolve('url'),
        assert: require.resolve('assert'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        vm: require.resolve("vm-browserify"),
        zlib: false,
        'process/browser': require.resolve("process/browser.js"),
        path: require.resolve("path-browserify"),
        '@react-native-async-storage/async-storage': false // Suppress MetaMask SDK React Native import warning
    };
    
    // Add resolve aliases for porto package to fix module resolution warnings
    const path = require('path');
    const fs = require('fs');
    
    config.resolve.alias = config.resolve.alias || {};
    
    // Try to resolve porto from nested node_modules (where it actually is)
    const portoNestedPath = path.resolve(__dirname, 'node_modules/wagmi/node_modules/@wagmi/connectors/node_modules/porto');
    if (fs.existsSync(portoNestedPath)) {
        // Point to the package root, not the dist file, so webpack can resolve subpaths
        config.resolve.alias['porto'] = portoNestedPath;
        
        // For porto/internal, point to the dist/internal directory
        const portoInternalDir = path.join(portoNestedPath, 'dist', 'internal');
        if (fs.existsSync(portoInternalDir)) {
            config.resolve.alias['porto/internal'] = portoInternalDir;
        }
    }
    
    // Add the nested node_modules to resolve.modules so webpack can find porto
    if (!config.resolve.modules) {
        config.resolve.modules = ['node_modules'];
    }
    const nestedModulesPath = path.resolve(__dirname, 'node_modules/wagmi/node_modules/@wagmi/connectors/node_modules');
    if (fs.existsSync(nestedModulesPath) && !config.resolve.modules.includes(nestedModulesPath)) {
        config.resolve.modules.push(nestedModulesPath);
    }
    
    // Add rule to transform import attributes syntax before Babel processes it
    // This fixes the issue with @coinbase/wallet-sdk using "import ... with type: 'json'"
    if (config.module && config.module.rules) {
        // Find the oneOf rule that contains babel-loader
        const oneOfRule = config.module.rules.find(rule => rule.oneOf);
        if (oneOfRule && oneOfRule.oneOf) {
            // Insert a rule at the very beginning to transform import attributes
            // Must be first so it runs before Babel
            oneOfRule.oneOf.unshift({
                test: /\.js$/,
                include: /node_modules/,
                enforce: 'pre', // Run before other loaders
                use: [
                    {
                        loader: require.resolve('string-replace-loader'),
                        options: {
                            // Match: import ... from "..." with type: 'json';
                            search: /import\s+([\w*{}\s,]+)\s+from\s+(['"])([^'"]+)\2\s+with\s+type:\s*['"]json['"];?/g,
                            replace: "import $1 from $2$3$2;",
                            flags: 'g'
                        }
                    }
                ]
            });
        } else {
            // Fallback: Insert at the beginning of rules
            config.module.rules.unshift({
                test: /\.js$/,
                include: /node_modules/,
                enforce: 'pre', // Run before other loaders
                use: [
                    {
                        loader: require.resolve('string-replace-loader'),
                        options: {
                            search: /import\s+([\w*{}\s,]+)\s+from\s+(['"])([^'"]+)\2\s+with\s+type:\s*['"]json['"];?/g,
                            replace: "import $1 from $2$3$2;",
                            flags: 'g'
                        }
                    }
                ]
            });
        }
    }
    
    // Suppress source map warnings for missing source maps in node_modules
    if (config.ignoreWarnings) {
        config.ignoreWarnings.push(/Failed to parse source map/);
    } else {
        config.ignoreWarnings = [/Failed to parse source map/];
    }
    
    //config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
        }),
  ]);
    return config;
}
