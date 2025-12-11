/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
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
    
    // Ignore problematic test-related exports from viem
    config.resolve.alias = {
      ...config.resolve.alias,
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

