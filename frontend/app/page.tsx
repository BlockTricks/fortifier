'use client';

import { useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
  makeContractCall, 
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST2QNSNKR3NRDWNTX0Q7R4T8WGBJ8RE8RA7GKS7WN.circuit-breaker';
const [address, contractName] = CONTRACT_ADDRESS.split('.');

export default function Home() {
  const [userData, setUserData] = useState<any>(null);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [network, setNetwork] = useState<StacksTestnet | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const appConfig = new AppConfig(['store_write', 'publish_data']);
      const session = new UserSession({ appConfig });
      const net = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });
      
      setUserSession(session);
      setNetwork(net);
      
      if (session.isUserSignedIn()) {
        setUserData(session.loadUserData());
      }
      checkPauseStatus();
    }
  }, []);

  const connectWallet = async () => {
    if (!userSession) return;
    
    showConnect({
      appDetails: {
        name: 'Fortifier',
        icon: window.location.origin + '/icon.png',
      },
      onFinish: () => {
        if (userSession) {
          const userData = userSession.loadUserData();
          setUserData(userData);
          setStatus('Wallet connected!');
        }
      },
      userSession,
    });
  };

  const disconnect = () => {
    if (userSession) {
      userSession.signUserOut();
    }
    setUserData(null);
    setStatus('Disconnected');
  };

  const checkPauseStatus = async () => {
    try {
      const response = await fetch(
        `https://api.testnet.hiro.so/v2/contracts/call-read/${address}/${contractName}/is-paused`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: address,
            arguments: [],
          }),
        }
      );
      const data = await response.json();
      setIsPaused(data.result?.repr === 'true');
    } catch (error) {
      console.error('Error checking pause status:', error);
    }
  };

  const pauseContract = async () => {
    if (!userData || !network || !userSession) {
      setStatus('Please connect wallet first');
      return;
    }

    setLoading(true);
    setStatus('Pausing contract...');

    try {
      const txOptions = {
        contractAddress: address,
        contractName: contractName,
        functionName: 'pause',
        functionArgs: [],
        senderKey: userData.appPrivateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: 1000,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, network);

      if (broadcastResponse.error) {
        setStatus(`Error: ${broadcastResponse.error}`);
      } else {
        setStatus(`Transaction submitted! TX: ${broadcastResponse.txid}`);
        setTimeout(checkPauseStatus, 5000);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const unpauseContract = async () => {
    if (!userData || !network || !userSession) {
      setStatus('Please connect wallet first');
      return;
    }

    setLoading(true);
    setStatus('Unpausing contract...');

    try {
      const txOptions = {
        contractAddress: address,
        contractName: contractName,
        functionName: 'unpause',
        functionArgs: [],
        senderKey: userData.appPrivateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: 1000,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, network);

      if (broadcastResponse.error) {
        setStatus(`Error: ${broadcastResponse.error}`);
      } else {
        setStatus(`Transaction submitted! TX: ${broadcastResponse.txid}`);
        setTimeout(checkPauseStatus, 5000);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Fortifier
            </h1>
            <p className="text-xl text-gray-300">
              On-chain Incident Response & Resilience Toolkit
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Contract: {CONTRACT_ADDRESS}
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
            {/* Wallet Connection */}
            <div className="mb-8">
              {!userData ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Connected</p>
                    <p className="text-lg font-mono">{userData.profile?.stxAddress?.testnet || 'N/A'}</p>
                  </div>
                  <button
                    onClick={disconnect}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Status Display */}
            <div className="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Circuit Breaker Status</h2>
                <div className={`px-4 py-2 rounded-full font-semibold ${
                  isPaused === null 
                    ? 'bg-gray-600' 
                    : isPaused 
                    ? 'bg-red-600' 
                    : 'bg-green-600'
                }`}>
                  {isPaused === null ? 'Loading...' : isPaused ? 'PAUSED' : 'ACTIVE'}
                </div>
              </div>
              <button
                onClick={checkPauseStatus}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Refresh Status
              </button>
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={pauseContract}
                disabled={loading || !userData || isPaused}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {loading ? 'Processing...' : 'Emergency Pause'}
              </button>
              <button
                onClick={unpauseContract}
                disabled={loading || !userData || !isPaused}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {loading ? 'Processing...' : 'Unpause'}
              </button>
            </div>

            {/* Status Message */}
            {status && (
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-sm">{status}</p>
              </div>
            )}

            {/* Contract Info */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Contract Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span className="font-mono">Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Contract:</span>
                  <span className="font-mono text-xs break-all">{CONTRACT_ADDRESS}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Explorer:</span>
                  <a 
                    href={`https://explorer.stacks.co/?chain=testnet&address=${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
