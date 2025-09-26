import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from './ConnectButton';
import { GroupList } from './GroupList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useXChat } from '../hooks/useXChat';
import { useZamaEncryption } from '../hooks/useZamaEncryption';
import { CryptoUtils } from '../utils/crypto';

export const ChatApp: React.FC = () => {
  const { address } = useAccount();
  const { 
    state, 
    createGroup, 
    joinGroup, 
    sendMessage, 
    setCurrentGroup 
  } = useXChat();
  
  const { 
    encryptPasswordAddress, 
    isInitialized: isZamaInitialized 
  } = useZamaEncryption();

  const handleSendMessage = async (messageText: string) => {
    if (state.currentGroup === null || !isZamaInitialized) return;

    try {
      // Generate a random password that looks like an Ethereum address
      const password = CryptoUtils.generatePasswordAddress();
      
      // Encrypt the message with AES using the password
      const encryptedMessage = CryptoUtils.encryptMessage(messageText, password);
      
      // Encrypt the password address using Zama FHE
      const encryptedPassword = await encryptPasswordAddress(password);
      
      console.log('Sending message:', {
        original: messageText,
        encrypted: encryptedMessage,
        password,
        zamaEncryptedHandle: encryptedPassword.handle,
      });

      await sendMessage(
        state.currentGroup,
        encryptedMessage,
        encryptedPassword.handle,
        encryptedPassword.inputProof
      );
    } catch (error) {
      console.error('Error sending encrypted message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  if (!address) {
    return (
      <div style={styles.container}>
        <ConnectButton />
        <div style={styles.welcomeContainer}>
          <div style={styles.welcome}>
            <h1 style={styles.title}>🔐 XChat</h1>
            <p style={styles.subtitle}>Encrypted Group Chat on Blockchain</p>
            <p style={styles.description}>
              Connect your wallet to start using XChat - a secure group chat application
              that uses AES encryption for messages and Zama FHE for password protection.
            </p>
            <div style={styles.features}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🏠</span>
                <span>Create and join groups</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🔒</span>
                <span>End-to-end encrypted messaging</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>⛓️</span>
                <span>Decentralized on blockchain</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ConnectButton />
      <div style={styles.chatContainer}>
        <GroupList
          groups={state.groups}
          currentGroup={state.currentGroup}
          onSelectGroup={setCurrentGroup}
          onCreateGroup={createGroup}
          onJoinGroup={joinGroup}
          isLoading={state.isLoading}
        />
        <div style={styles.messageContainer}>
          <MessageList
            messages={state.messages}
            currentGroup={state.currentGroup}
          />
          <MessageInput
            currentGroup={state.currentGroup}
            onSendMessage={handleSendMessage}
            isLoading={state.isLoading}
            isZamaInitialized={isZamaInitialized}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'Arial, sans-serif',
  },
  welcomeContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    textAlign: 'center' as const,
    maxWidth: '600px',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '3rem',
    color: '#333',
  },
  subtitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.2rem',
    color: '#666',
  },
  description: {
    margin: '0 0 2rem 0',
    fontSize: '1rem',
    color: '#555',
    lineHeight: 1.6,
  },
  features: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    alignItems: 'flex-start',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '1rem',
    color: '#333',
  },
  featureIcon: {
    fontSize: '1.5rem',
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  messageContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
};