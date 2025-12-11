'use client';

import { useState, useEffect } from 'react';
import { AppConfig, UserSession, authenticate, openContractCall } from '@stacks/connect';
import { 
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';
import { useTheme } from './contexts/ThemeContext';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST2QNSNKR3NRDWNTX0Q7R4T8WGBJ8RE8RA7GKS7WN.circuit-breaker';
const [address, contractName] = CONTRACT_ADDRESS.split('.');

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [network, setNetwork] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const appConfig = new AppConfig(['store_write', 'publish_data']);
      const session = new UserSession({ appConfig });
      // Create network configuration object for testnet (contract is deployed here)
      const net = {
        url: 'https://api.testnet.hiro.so',
        network: 'testnet' as const,
      };
      
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
    
    try {
      await authenticate({
        appDetails: {
          name: 'Fortifier',
          icon: window.location.origin + '/icon.png',
        },
        redirectTo: '/',
        onFinish: () => {
          if (userSession) {
            const userData = userSession.loadUserData();
            setUserData(userData);
            setStatus('Wallet connected!');
          }
        },
        userSession,
      });
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setStatus(`Error: ${error.message || 'Failed to connect wallet'}`);
    }
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
    if (!userData || !userSession || !network) {
      setStatus('Please connect wallet first');
      return;
    }

    setLoading(true);
    setStatus('Pausing contract...');

    try {
      await openContractCall({
        contractAddress: address,
        contractName: contractName,
        functionName: 'pause',
        functionArgs: [],
        network: network.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setStatus(`Transaction submitted! TX: ${data.txId}`);
          setLoading(false);
          setTimeout(checkPauseStatus, 5000);
        },
        onCancel: () => {
          setStatus('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error: any) {
      console.error('Transaction error:', error);
      setStatus(`Error: ${error.message || 'Transaction failed. Make sure you are the contract owner and have sufficient STX for fees.'}`);
      setLoading(false);
    }
  };

  const unpauseContract = async () => {
    if (!userData || !userSession || !network) {
      setStatus('Please connect wallet first');
      return;
    }

    setLoading(true);
    setStatus('Unpausing contract...');

    try {
      await openContractCall({
        contractAddress: address,
        contractName: contractName,
        functionName: 'unpause',
        functionArgs: [],
        network: network.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setStatus(`Transaction submitted! TX: ${data.txId}`);
          setLoading(false);
          setTimeout(checkPauseStatus, 5000);
        },
        onCancel: () => {
          setStatus('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error: any) {
      console.error('Transaction error:', error);
      setStatus(`Error: ${error.message || 'Transaction failed. Make sure you are the contract owner and have sufficient STX for fees.'}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-50 dark:via-gray-100 dark:to-gray-50 text-white dark:text-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Theme Toggle Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 dark:from-blue-600 dark:to-purple-700 bg-clip-text text-transparent">
              Fortifier
            </h1>
            <p className="text-xl text-gray-300 dark:text-gray-700">
              On-chain Incident Response & Resilience Toolkit
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-2">
              Contract: {CONTRACT_ADDRESS}
          </p>
        </div>

          <div className="bg-gray-800/50 dark:bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700 dark:border-gray-300">
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
                    <p className="text-sm text-gray-400 dark:text-gray-600">Connected</p>
                    <p className="text-lg font-mono dark:text-gray-900">{userData.profile?.stxAddress?.testnet || userData.profile?.stxAddress?.mainnet || 'N/A'}</p>
                  </div>
                  <button
                    onClick={disconnect}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Status Display */}
            <div className="mb-8 p-4 bg-gray-900/50 dark:bg-gray-100/50 rounded-lg border border-gray-700 dark:border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold dark:text-gray-900">Circuit Breaker Status</h2>
                <div className={`px-4 py-2 rounded-full font-semibold ${
                  isPaused === null 
                    ? 'bg-gray-600 dark:bg-gray-400' 
                    : isPaused 
                    ? 'bg-red-600 dark:bg-red-500' 
                    : 'bg-green-600 dark:bg-green-500'
                }`}>
                  {isPaused === null ? 'Loading...' : isPaused ? 'PAUSED' : 'ACTIVE'}
                </div>
              </div>
              <button
                onClick={checkPauseStatus}
                className="text-sm text-blue-400 dark:text-blue-600 hover:text-blue-300 dark:hover:text-blue-700"
              >
                Refresh Status
              </button>
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={pauseContract}
                disabled={loading || !userData || isPaused === true}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:bg-gray-600 dark:disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {loading ? 'Processing...' : 'Emergency Pause'}
              </button>
              <button
                onClick={unpauseContract}
                disabled={loading || !userData || isPaused !== true}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-gray-600 dark:disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {loading ? 'Processing...' : 'Unpause'}
              </button>
            </div>

            {/* Status Message */}
            {status && (
              <div className="mt-4 p-4 bg-blue-900/30 dark:bg-blue-100/50 border border-blue-700 dark:border-blue-300 rounded-lg">
                <p className="text-sm dark:text-gray-900">{status}</p>
              </div>
            )}

            {/* Contract Info */}
            <div className="mt-8 pt-8 border-t border-gray-700 dark:border-gray-300">
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-900">Contract Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-600">Network:</span>
                  <span className="font-mono dark:text-gray-900">Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-600">Contract:</span>
                  <span className="font-mono text-xs break-all dark:text-gray-900">{CONTRACT_ADDRESS}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-600">Explorer:</span>
                  <a 
                    href={`https://explorer.stacks.co/?chain=testnet&address=${address}`}
            target="_blank"
            rel="noopener noreferrer"
                    className="text-blue-400 dark:text-blue-600 hover:text-blue-300 dark:hover:text-blue-700"
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
