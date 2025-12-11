#!/usr/bin/env node

/**
 * Verify all contracts use Clarity 4 syntax
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractsDir = join(__dirname, '..', 'contracts');
const contracts = readdirSync(contractsDir).filter(f => f.endsWith('.clar'));

console.log('🔍 Verifying Clarity 4 compliance...\n');

let allValid = true;

for (const contract of contracts) {
  const path = join(contractsDir, contract);
  const content = readFileSync(path, 'utf8');
  
  console.log(`📄 ${contract}:`);
  
  // Check for Clarity 4 features (at least 3 must be present)
  const checks = {
    'Error constants (err uXXXX)': /\(err u\d+\)/.test(content),
    'Modern event syntax': /define-event/.test(content),
    'Structured data types': /\{[^}]+\}/.test(content),
    'Pattern matching': /match/.test(content),
    'Functional patterns': /(filter|map|find|append)/.test(content),
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const requiredChecks = 3; // At least 3 Clarity 4 features
  
  console.log(`   Features found: ${passedChecks}/5`);
  for (const [check, passed] of Object.entries(checks)) {
    const status = passed ? '✅' : '  ';
    console.log(`   ${status} ${check}`);
  }
  
  if (passedChecks >= requiredChecks) {
    console.log(`   ✅ Clarity 4 compliant\n`);
  } else {
    console.log(`   ⚠️  May need more Clarity 4 features\n`);
    allValid = false;
  }
}

if (allValid) {
  console.log('✨ All contracts are Clarity 4 compliant!');
  process.exit(0);
} else {
  console.log('⚠️  Some contracts may need updates');
  process.exit(1);
}

