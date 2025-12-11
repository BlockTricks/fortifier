#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const patches = [
  'node_modules/viem/_esm/clients/decorators/test.js',
  'node_modules/@walletconnect/utils/node_modules/viem/_esm/clients/decorators/test.js',
];

const patchContent = "export const testActions = () => () => ({});\n";

patches.forEach(patchPath => {
  const fullPath = path.join(__dirname, '..', patchPath);
  if (fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, patchContent);
    console.log(`✅ Patched: ${patchPath}`);
  }
});

console.log('✅ Viem patching complete!');

