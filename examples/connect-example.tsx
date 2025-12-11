/**
 * Example: Using @stacks/connect with Fortifier
 * This demonstrates how to use @stacks/connect for user interactions
 */

import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { FortifierClient } from '../src/fortifier-client';

// Configure Stacks Connect
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Fortifier contract addresses (update after deployment)
const fortifierConfig = {
  network: 'testnet' as const,
  circuitBreakerAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.circuit-breaker',
  guardAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.guard',
  quarantineAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.quarantine',
  roleChangeGuardianAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.role-change-guardian',
  fortifierAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.fortifier',
};

const client = new FortifierClient(fortifierConfig);

// Example: Connect wallet
export async function connectWallet() {
  showConnect({
    appDetails: {
      name: 'Fortifier',
      icon: 'https://fortifier.example.com/icon.png',
    },
    onFinish: () => {
      console.log('User connected:', userSession.loadUserData());
    },
    userSession,
  });
}

// Example: Pause circuit breaker
export async function handlePause() {
  if (!userSession.isUserSignedIn()) {
    await connectWallet();
    return;
  }

  await client.pauseCircuitBreaker(userSession);
}

// Example: Quarantine a recipient
export async function handleQuarantine(recipient: string, reason: string, severity: number) {
  if (!userSession.isUserSignedIn()) {
    await connectWallet();
    return;
  }

  await client.quarantineRecipient(userSession, recipient, reason, severity);
}

// Example: Propose signer change
export async function handleProposeSignerChange(target: string, newSigner: string) {
  if (!userSession.isUserSignedIn()) {
    await connectWallet();
    return;
  }

  await client.proposeSignerChange(userSession, target, newSigner);
}

// React component example (if using React)
export function FortifierControls() {
  return (
    <div>
      <h2>Fortifier Controls</h2>
      <button onClick={connectWallet}>Connect Wallet</button>
      <button onClick={handlePause}>Emergency Pause</button>
      <button onClick={() => handleQuarantine(
        'ST123...',
        'Suspicious activity detected',
        8
      )}>
        Quarantine Recipient
      </button>
    </div>
  );
}

