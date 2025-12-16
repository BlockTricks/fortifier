#!/usr/bin/env node

/**
 * Fortifier Deployment Script
 * Uses @stacks/transactions to deploy Clarity 4 contracts to Stacks
 */

import * as transactions from '@stacks/transactions';
import networkPkg from '@stacks/network';
import { generateWallet } from '@stacks/wallet-sdk';
import { mnemonicToSeedSync } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Use networkFromName to create network instances
const { networkFromName } = networkPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually to handle multi-word mnemonics
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Only deploy circuit-breaker to stay under 0.5 STX limit
const CONTRACTS = [
  'circuit-breaker'
];

async function deployContract(contractName, network, privateKey, isMainnet) {
  const contractPath = join(__dirname, '..', 'contracts', `${contractName}.clar`);
  const contractCode = readFileSync(contractPath, 'utf8');
  
  // Convert hex private key to Buffer
  const privateKeyBuffer = Buffer.from(privateKey, 'hex');
  
  // Derive address from private key
  const address = transactions.privateKeyToAddress(
    privateKeyBuffer,
    isMainnet ? transactions.AddressVersion.MainnetSingleSig : transactions.AddressVersion.TestnetSingleSig
  );
  const contractAddress = address;
  
  console.log(`\n📦 Deploying ${contractName}...`);
  console.log(`   Address: ${address}`);
  
  try {
    // Get account info including nonce
    const { getAccount } = await import('@stacks/network');
    const client = getAccount(network);
    const accountInfo = await client.getAccount(address);
    const nonce = accountInfo.nonce;
    
    // Create final transaction with correct nonce
    const txOptions = {
      contractName,
      codeBody: contractCode,
      senderKey: privateKeyBuffer,
      network,
      anchorMode: transactions.AnchorMode.Any,
      postConditionMode: transactions.PostConditionMode.Allow,
      fee: 10000,
      nonce: nonce,
      clarityVersion: transactions.ClarityVersion.Clarity4, // Use Clarity 4
    };

    const transaction = await transactions.makeContractDeploy(txOptions);
    console.log(`   ✅ Transaction created: ${transaction.txid()}`);
    
    const broadcastResponse = await transactions.broadcastTransaction(transaction, network);
    
    if (broadcastResponse.error) {
      console.error(`   ❌ Error: ${broadcastResponse.error}`);
      if (broadcastResponse.reason) {
        console.error(`   Reason: ${broadcastResponse.reason}`);
      }
      return null;
    }
    
    console.log(`   ✅ Broadcast successful!`);
    console.log(`   📡 TX ID: ${broadcastResponse.txid}`);
    const chainParam = network.chainId === 2147483648 ? 'testnet' : 'mainnet';
    console.log(`   🔗 Explorer: https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=${chainParam}`);
    
    return {
      contractName,
      txid: broadcastResponse.txid,
      address: `${contractAddress}.${contractName}`
    };
  } catch (error) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    return null;
  }
}

async function main() {
  const networkType = process.argv[2] || 'testnet';
  
  if (!['testnet', 'mainnet'].includes(networkType)) {
    console.error('Usage: node deploy.js [testnet|mainnet]');
    process.exit(1);
  }
  
  const isMainnet = networkType === 'mainnet';
  
  // Create network configuration
  const network = networkFromName(isMainnet ? 'mainnet' : 'testnet', {
    url: isMainnet ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so'
  });
  
  // Get private key from environment or mnemonic
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  // If no private key, try to get from mnemonic
  if (!privateKey) {
    // Try reading directly from .env file if env var is incomplete
    let mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic || mnemonic.split(/\s+/).length < 12) {
      // Read directly from .env file
      const envPath = join(__dirname, '..', '.env');
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf8');
        const mnemonicMatch = envContent.match(/DEPLOYER_MNEMONIC\s*=\s*(.+?)(?:\n|$)/);
        if (mnemonicMatch) {
          mnemonic = mnemonicMatch[1].trim();
          // Remove quotes if present
          if ((mnemonic.startsWith('"') && mnemonic.endsWith('"')) || 
              (mnemonic.startsWith("'") && mnemonic.endsWith("'"))) {
            mnemonic = mnemonic.slice(1, -1);
          }
        }
      }
    }
    
    if (mnemonic) {
      try {
        console.log('🔑 Deriving private key from mnemonic...');
        // Clean up mnemonic
        mnemonic = mnemonic.trim().replace(/^["']|["']$/g, '');
        const words = mnemonic.split(/\s+/).filter(w => w.length > 0);
        console.log(`   Mnemonic words: ${words.length}`);
        console.log(`   First 3 words: ${words.slice(0, 3).join(' ')}`);
        
        // Derive directly using BIP39 and BIP32
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        // Stacks uses derivation path m/44'/5757'/0'/0/0
        const stacksKey = hdKey.derive("m/44'/5757'/0'/0/0");
        const privateKeyBuffer = stacksKey.privateKey;
        if (!privateKeyBuffer) {
          throw new Error('Failed to derive private key from HD key');
        }
        privateKey = privateKeyBuffer.toString('hex');
        
        // Derive address using privateKeyToAddress
        const address = transactions.privateKeyToAddress(
          privateKeyBuffer,
          isMainnet ? transactions.AddressVersion.MainnetSingleSig : transactions.AddressVersion.TestnetSingleSig
        );
        console.log(`   ✅ Derived address: ${address}`);
      } catch (error) {
        console.error('❌ Failed to derive private key from mnemonic:', error.message);
        console.error('   Make sure the mnemonic is valid BIP39 format (12 or 24 words)');
        if (error.stack) {
          console.error('   Stack:', error.stack);
        }
        process.exit(1);
      }
    }
  }
  
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY or DEPLOYER_MNEMONIC environment variable not set');
    console.error('   Set it with: export DEPLOYER_PRIVATE_KEY=your_private_key');
    console.error('   Or: export DEPLOYER_MNEMONIC="your 24 word mnemonic"');
    console.error('   Or add it to .env file');
    process.exit(1);
  }
  
  console.log(`\n🚀 Fortifier Deployment`);
  console.log(`   Network: ${networkType}`);
  console.log(`   Contracts: ${CONTRACTS.length}`);
  console.log(`   Using @stacks/transactions for deployment\n`);
  
  const results = [];
  
  for (const contract of CONTRACTS) {
    const result = await deployContract(contract, network, privateKey, isMainnet);
    if (result) {
      results.push(result);
    }
    // Wait a bit between deployments
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`\n\n📊 Deployment Summary:`);
  console.log(`   ✅ Successful: ${results.length}/${CONTRACTS.length}`);
  
  if (results.length > 0) {
    console.log(`\n📝 Deployed Contracts:`);
    results.forEach(r => {
      console.log(`   • ${r.contractName}: ${r.address}`);
      console.log(`     TX: ${r.txid}`);
    });
  }
  
  if (results.length < CONTRACTS.length) {
    console.log(`\n⚠️  Some contracts failed to deploy. Check errors above.`);
    process.exit(1);
  }
  
  console.log(`\n✨ Deployment complete!\n`);
}

main().catch(console.error);
