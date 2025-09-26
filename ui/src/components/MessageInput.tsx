import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface MessageInputProps {
  currentGroup: number | null;
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isZamaInitialized?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  currentGroup,
  onSendMessage,
  isLoading,
  isZamaInitialized = true,
}) => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || currentGroup === null || !address) {
      return;
    }

    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  if (currentGroup === null) {
    return (
      <div style={styles.container}>
        <div style={styles.disabled}>
          <p>Select a group to send messages</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div style={styles.container}>
        <div style={styles.disabled}>
          <p>Connect your wallet to send messages</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.input}
          disabled={isLoading}
          maxLength={500}
        />
        <button
          type="submit"
          style={{
            ...styles.sendButton,
            ...(isLoading || !message.trim() || !isZamaInitialized ? styles.disabledButton : {}),
          }}
          disabled={isLoading || !message.trim() || !isZamaInitialized}
        >
          {isLoading ? 'Sending...' : !isZamaInitialized ? 'Initializing...' : 'Send'}
        </button>
      </form>
      
      {message.length > 400 && (
        <div style={styles.charCount}>
          {message.length}/500 characters
        </div>
      )}
      
      <div style={styles.info}>
        <p style={styles.infoText}>
          💡 Messages are encrypted with AES before being sent to the blockchain.
          The encryption password is protected using Zama FHE.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  disabled: {
    padding: '1rem',
    textAlign: 'center' as const,
    color: '#666',
  },
  form: {
    display: 'flex',
    padding: '1rem',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    outline: 'none',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  charCount: {
    textAlign: 'right' as const,
    paddingRight: '1rem',
    fontSize: '0.8rem',
    color: '#666',
  },
  info: {
    padding: '0.5rem 1rem 1rem 1rem',
  },
  infoText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#666',
    fontStyle: 'italic',
  },
};