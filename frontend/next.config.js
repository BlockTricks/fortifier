/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    const webpack = require('webpack');
    const path = require('path');
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      worker_threads: false,
    };
    
    // Exclude test files and unnecessary files from node_modules
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Ignore test files
    config.module.rules.push({
      test: /node_modules\/.*\/(test|tests|__tests__|\.test\.|\.spec\.|bench|benchmark|\.bench\.)/,
      use: 'ignore-loader',
    });
    
    // Ignore markdown, license, and other non-code files
    config.module.rules.push({
      test: /\.(md|txt|LICENSE)$/,
      use: 'ignore-loader',
    });
    
    // Handle viem testActions export issue with comprehensive replacement
    config.plugins = config.plugins || [];
    const viemTestStub = path.resolve(__dirname, 'webpack-fixes/viem-test-stub.js');
    
    // Replace all variations of viem test decorator imports
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /(.*\/)?viem\/_esm\/clients\/decorators\/test\.js$/,
        viemTestStub
      )
    );
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /(.*\/)?viem\/_cjs\/clients\/decorators\/test\.js$/,
        viemTestStub
      )
    );
    
    // Handle relative imports from within viem packages
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^\.\/clients\/decorators\/test\.js$/,
        (resource) => {
          if (resource.context && (resource.context.includes('viem') || resource.context.includes('@walletconnect'))) {
            resource.request = viemTestStub;
          }
        }
      )
    );
    
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^\.\.\/decorators\/test\.js$/,
        (resource) => {
          if (resource.context && (resource.context.includes('viem') || resource.context.includes('@walletconnect'))) {
            resource.request = viemTestStub;
          }
        }
      )
    );
    
    // Comprehensive resolve aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      'viem/_esm/clients/decorators/test': viemTestStub,
      'viem/_cjs/clients/decorators/test': viemTestStub,
    };
    
    // Exclude problematic packages from being processed
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino': false,
        'pino-pretty': false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
