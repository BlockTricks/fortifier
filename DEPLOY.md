# Deploy Fortifier

## Workspace Cleaned ✅

All unnecessary files removed. Only essential files remain:
- Contracts (circuit-breaker, guard, quarantine, role-change-guardian, fortifier)
- Tests
- Deployment configuration
- Scripts

## Deployment Ready

**Cost:** 0.482385 STX (under 0.5 STX limit)  
**Contract:** circuit-breaker  
**Network:** Stacks Testnet

## Deploy Command

Run this in your terminal:

```bash
clarinet deployment apply -p deployments/default.testnet-plan.yaml
```

Type `Y` when prompted to confirm.

## Configuration

- Mnemonic configured in `settings/Testnet.toml` (from .env)
- Deployment plan ready in `deployments/default.testnet-plan.yaml`
- All contracts verified and ready

