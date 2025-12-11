#!/usr/bin/env node

/**
 * Script to verify contract deployment and owner on Stacks
 */

const https = require('https');

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST2QNSNKR3NRDWNTX0Q7R4T8WGBJ8RE8RA7GKS7WN.circuit-breaker';
const [address, contractName] = CONTRACT_ADDRESS.split('.');
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          reject(new Error('NOT_FOUND'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

async function verifyContract() {
  console.log('🔍 Verifying Contract Deployment\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${NETWORK}\n`);

  const apiUrl = NETWORK === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';

  try {
    // Check if contract exists
    const contractUrl = `${apiUrl}/v2/contracts/${address}/${contractName}`;
    console.log('Checking contract existence...');
    const contractInfo = await fetchJSON(contractUrl);
    
    console.log(`✅ Contract found on ${NETWORK}!`);
    console.log(`   Source: ${contractInfo.source_code ? 'Available' : 'Not available'}`);
    console.log(`   Clarity Version: ${contractInfo.clarity_version || 'Unknown'}\n`);

    // Try to read owner
    console.log('Checking contract owner...');
    try {
      const ownerUrl = `${apiUrl}/v2/contracts/call-read/${address}/${contractName}/get-owner`;
      const ownerResponse = await fetchJSON(ownerUrl);
      if (ownerResponse.result) {
        console.log(`   Owner: ${ownerResponse.result.repr}`);
      }
    } catch (e) {
      console.log('   ⚠️  Could not read owner (function may not exist)');
    }

    // Check pause status
    console.log('\nChecking pause status...');
    try {
      const pauseUrl = `${apiUrl}/v2/contracts/call-read/${address}/${contractName}/is-paused`;
      const pauseResponse = await fetchJSON(pauseUrl);
      if (pauseResponse.result) {
        const isPaused = pauseResponse.result.repr === 'true';
        console.log(`   Status: ${isPaused ? 'PAUSED' : 'ACTIVE'}`);
      }
    } catch (e) {
      console.log('   ⚠️  Could not read pause status');
    }

    console.log('\n✅ Verification complete!');
    console.log(`\n📝 Explorer Link:`);
    console.log(`   https://explorer.stacks.co/?chain=${NETWORK}&address=${address}`);

  } catch (error) {
    if (error.message === 'NOT_FOUND' || error.message.includes('404') || error.message.includes('Not Found')) {
      console.log(`❌ Contract not found on ${NETWORK}!`);
      console.log('\nPossible reasons:');
      console.log('  1. Contract not deployed yet');
      console.log('  2. Wrong contract address');
      console.log(`  3. Contract deployed on ${NETWORK === 'mainnet' ? 'testnet' : 'mainnet'} instead`);
      console.log(`\n💡 To deploy the contract:`);
      console.log(`   cd .. && npm run deploy:${NETWORK}`);
      console.log('   (Requires DEPLOYER_PRIVATE_KEY in .env)');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

verifyContract();
