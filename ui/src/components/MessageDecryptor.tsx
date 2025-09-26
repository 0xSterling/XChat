import React, { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useZamaEncryption } from '../hooks/useZamaEncryption';
import { CryptoUtils } from '../utils/crypto';
import { Message } from '../types';
import { XCHAT_CONTRACT_ADDRESS } from '../utils/contract';

interface MessageDecryptorProps {
  message: Message;
  onDecrypted: (messageId: number, decryptedText: string) => void;
}

export const MessageDecryptor: React.FC<MessageDecryptorProps> = ({
  message,
  onDecrypted,
}) => {
  const { address } = useAccount();
  const { decryptPasswordAddress, isInitialized } = useZamaEncryption();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const handleDecrypt = useCallback(async () => {
    if (!address || !isInitialized) return;

    setIsDecrypting(true);
    setDecryptionError(null);

    try {
      // Step 1: Prepare password address decryption
      console.log('Preparing to decrypt password address...');
      const decryptionData = await decryptPasswordAddress(
        message.encryptedPasswordAddress,
        XCHAT_CONTRACT_ADDRESS
      );

      // In a real implementation, you would need to:
      // 1. Get the user's signature for the EIP712 data
      // 2. Call the relayer to decrypt the password address
      // 3. Use the decrypted password to decrypt the message

      // For demonstration purposes, we'll simulate the decryption
      // In a real app, you would need proper wallet integration
      console.log('Decryption data prepared:', decryptionData);

      // Placeholder: Try to decrypt with a known password format
      // This is just for demo - in reality you'd get the password from Zama decryption
      const possiblePasswords = [
        // Try some common test passwords that might have been used
        '0x1234567890123456789012345678901234567890',
        '0x0000000000000000000000000000000000000000',
        address, // Try user's address
      ];

      let decrypted = false;
      for (const testPassword of possiblePasswords) {
        try {
          const decryptedText = CryptoUtils.decryptMessage(
            message.encryptedMessage,
            testPassword
          );
          
          if (decryptedText) {
            console.log('Message decrypted successfully!');
            onDecrypted(message.id, decryptedText);
            decrypted = true;
            break;
          }
        } catch (error) {
          // Continue trying other passwords
          continue;
        }
      }

      if (!decrypted) {
        setDecryptionError(
          'Could not decrypt message. This is a demo limitation - ' +
          'proper Zama decryption with wallet signing would be needed.'
        );
      }

    } catch (error) {
      console.error('Decryption error:', error);
      setDecryptionError(
        error instanceof Error ? error.message : 'Unknown decryption error'
      );
    } finally {
      setIsDecrypting(false);
    }
  }, [
    address,
    isInitialized,
    decryptPasswordAddress,
    message,
    onDecrypted,
  ]);

  if (message.decryptedMessage) {
    return null; // Already decrypted
  }

  return (
    <div style={styles.container}>
      <button
        onClick={handleDecrypt}
        disabled={isDecrypting || !isInitialized}
        style={{
          ...styles.decryptButton,
          ...(isDecrypting || !isInitialized ? styles.disabledButton : {}),
        }}
      >
        {isDecrypting ? 'Decrypting...' : '🔓 Decrypt Message'}
      </button>
      
      {decryptionError && (
        <div style={styles.error}>
          <p style={styles.errorText}>❌ {decryptionError}</p>
          <p style={styles.helpText}>
            💡 In a full implementation, this would use Zama's user decryption 
            with proper wallet signing to decrypt the password address.
          </p>
        </div>
      )}
      
      {!isInitialized && (
        <div style={styles.warning}>
          <p style={styles.warningText}>⏳ Initializing Zama FHE...</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginTop: '0.5rem',
  },
  decryptButton: {
    backgroundColor: '#FF9800',
    color: 'white',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  error: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    border: '1px solid #f44336',
  },
  errorText: {
    margin: '0 0 0.5rem 0',
    color: '#d32f2f',
    fontSize: '0.8rem',
  },
  helpText: {
    margin: 0,
    color: '#666',
    fontSize: '0.7rem',
    fontStyle: 'italic',
  },
  warning: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#fff3e0',
    borderRadius: '4px',
    border: '1px solid #ff9800',
  },
  warningText: {
    margin: 0,
    color: '#e65100',
    fontSize: '0.8rem',
  },
};