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
