import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk';
import { XCHAT_CONTRACT_ADDRESS } from '../utils/contract';

export const useZamaEncryption = () => {
  const { address } = useAccount();
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize FHEVM instance
  const initializeFhevm = useCallback(async () => {
    if (fhevmInstance || isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Initializing FHEVM instance...');
      const instance = await createInstance(SepoliaConfig);
      setFhevmInstance(instance);
      setIsInitialized(true);
      console.log('FHEVM instance initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FHEVM:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fhevmInstance, isLoading]);

  // Encrypt password address using Zama FHE
  const encryptPasswordAddress = useCallback(async (passwordAddress: string) => {
    if (!fhevmInstance || !address) {
      throw new Error('FHEVM not initialized or wallet not connected');
    }

    try {
      console.log('Creating encrypted input for password address:', passwordAddress);
      
      // Create encrypted input
      const input = fhevmInstance.createEncryptedInput(XCHAT_CONTRACT_ADDRESS, address);
      input.addAddress(passwordAddress);
      const encryptedInput = await input.encrypt();

      console.log('Password address encrypted successfully');
      return {
        handle: encryptedInput.handles[0],
        inputProof: encryptedInput.inputProof,
      };
    } catch (error) {
      console.error('Error encrypting password address:', error);
      throw new Error('Failed to encrypt password address');
    }
  }, [fhevmInstance, address]);

  // Decrypt encrypted address for a user (re-encryption for user)
  const decryptPasswordAddress = useCallback(async (
    encryptedAddressHandle: string,
    contractAddress: string
  ) => {
    if (!fhevmInstance || !address) {
      throw new Error('FHEVM not initialized or wallet not connected');
    }

    try {
      console.log('Decrypting password address handle:', encryptedAddressHandle);

      // Generate keypair for decryption
      const keypair = fhevmInstance.generateKeypair();
      
      // Prepare handle-contract pairs for decryption
      const handleContractPairs = [{
        handle: encryptedAddressHandle,
        contractAddress: contractAddress,
      }];

      // Set up decryption parameters
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [contractAddress];

      // Create EIP712 signature data
      const eip712 = fhevmInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // Note: In a real implementation, you would need the user's wallet to sign this
      // For now, we'll return a placeholder
      console.log('Password address decryption prepared (signature required)');
      
      return {
        keypair,
        eip712,
        handleContractPairs,
        startTimeStamp,
        durationDays,
        contractAddresses,
      };
      
    } catch (error) {
      console.error('Error preparing password address decryption:', error);
      throw new Error('Failed to prepare password address decryption');
    }
  }, [fhevmInstance, address]);

  // Initialize on mount
  useEffect(() => {
    if (address && !fhevmInstance) {
      initializeFhevm();
    }
  }, [address, fhevmInstance, initializeFhevm]);

  return {
    fhevmInstance,
    isInitialized,
    isLoading,
    encryptPasswordAddress,
    decryptPasswordAddress,
    initializeFhevm,
  };
};