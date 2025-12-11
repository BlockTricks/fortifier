/**
 * Fortifier Client
 * Uses @stacks/connect and @stacks/transactions to interact with Fortifier contracts
 */

import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  StacksTestnet,
  StacksMainnet,
  standardPrincipalCV,
  uintCV,
  stringAsciiCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';

export interface FortifierConfig {
  network: 'testnet' | 'mainnet';
  circuitBreakerAddress: string;
  guardAddress: string;
  quarantineAddress: string;
  roleChangeGuardianAddress: string;
  fortifierAddress: string;
}

export class FortifierClient {
  private network: StacksTestnet | StacksMainnet;
  private config: FortifierConfig;

  constructor(config: FortifierConfig) {
    this.config = config;
    this.network = config.network === 'testnet'
      ? new StacksTestnet({ url: 'https://api.testnet.hiro.so' })
      : new StacksMainnet({ url: 'https://api.hiro.so' });
  }

  /**
   * Pause the circuit breaker using @stacks/connect
   */
  async pauseCircuitBreaker(userSession: any) {
    return openContractCall({
      network: this.network,
      contractAddress: this.config.circuitBreakerAddress.split('.')[0],
      contractName: 'circuit-breaker',
      functionName: 'pause',
      functionArgs: [],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('Pause transaction submitted:', data.txId);
      },
    });
  }

  /**
   * Quarantine a recipient using @stacks/connect
   */
  async quarantineRecipient(
    userSession: any,
    recipient: string,
    reason: string,
    severity: number
  ) {
    return openContractCall({
      network: this.network,
      contractAddress: this.config.quarantineAddress.split('.')[0],
      contractName: 'quarantine',
      functionName: 'quarantine-recipient',
      functionArgs: [
        standardPrincipalCV(recipient),
        stringAsciiCV(reason),
        uintCV(severity),
      ],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('Quarantine transaction submitted:', data.txId);
      },
    });
  }

  /**
   * Set spend cap using @stacks/transactions (programmatic)
   */
  async setSpendCap(
    privateKey: string,
    amount: number,
    period: number
  ) {
    const [address, contractName] = this.config.guardAddress.split('.');
    
    const txOptions = {
      contractAddress: address,
      contractName,
      functionName: 'set-spend-cap',
      functionArgs: [uintCV(amount), uintCV(period)],
      senderKey: privateKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 1000,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    
    return {
      txid: broadcastResponse.txid,
      success: !broadcastResponse.error,
    };
  }

  /**
   * Check if recipient is quarantined
   */
  async isQuarantined(recipient: string): Promise<boolean> {
    // This would typically use a read-only call
    // Implementation depends on your RPC setup
    return false;
  }

  /**
   * Propose signer change using @stacks/connect
   */
  async proposeSignerChange(
    userSession: any,
    target: string,
    newSigner: string
  ) {
    return openContractCall({
      network: this.network,
      contractAddress: this.config.roleChangeGuardianAddress.split('.')[0],
      contractName: 'role-change-guardian',
      functionName: 'propose-signer-change',
      functionArgs: [
        standardPrincipalCV(target),
        standardPrincipalCV(newSigner),
      ],
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        console.log('Signer change proposal submitted:', data.txId);
      },
    });
  }
}

