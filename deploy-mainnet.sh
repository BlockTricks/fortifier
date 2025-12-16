#!/bin/bash
# Deploy to mainnet with Clarity 4 settings
# This script answers 'n' to keep the Clarity 4 deployment plan

echo "🚀 Deploying circuit-breaker to Mainnet with Clarity 4..."
echo ""
echo "⚠️  When Clarinet asks to overwrite, we'll answer 'n' to keep Clarity 4 settings"
echo ""

# Use echo to pipe answers: 'n' to keep plan, 'Y' to continue
echo -e "n\nY" | clarinet deployments apply --mainnet


