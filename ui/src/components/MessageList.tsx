import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Message } from '../types';
import { MessageDecryptor } from './MessageDecryptor';

interface MessageListProps {
  messages: Message[];
  currentGroup: number | null;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentGroup,
}) => {
  const { address } = useAccount();
  const [decryptedMessages, setDecryptedMessages] = useState<{[key: number]: string}>({});

  const groupMessages = currentGroup !== null 
    ? messages.filter(msg => msg.groupId === currentGroup)
    : [];

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleMessageDecrypted = (messageId: number, decryptedText: string) => {
    setDecryptedMessages(prev => ({
      ...prev,
      [messageId]: decryptedText,
    }));
  };

  if (currentGroup === null) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h3>Select a group to view messages</h3>
          <p>Choose a group from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Group Messages</h3>
        <span style={styles.messageCount}>
          {groupMessages.length} message{groupMessages.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div style={styles.messageList}>
        {groupMessages.length === 0 ? (
          <div style={styles.noMessages}>
            <p>No messages in this group yet</p>
            <p>Be the first to send a message!</p>
          </div>
        ) : (
          groupMessages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageItem,
                ...(message.sender === address ? styles.ownMessage : styles.otherMessage),
              }}
            >
              <div style={styles.messageHeader}>
                <span style={styles.sender}>
                  {message.sender === address ? 'You' : formatAddress(message.sender)}
                </span>
                <span style={styles.timestamp}>
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              
              <div style={styles.messageContent}>
                {decryptedMessages[message.id] ? (
                  <p style={styles.decryptedText}>{decryptedMessages[message.id]}</p>
                ) : (
                  <div>
                    <p style={styles.encryptedText}>
                      🔐 Encrypted: {message.encryptedMessage.slice(0, 50)}...
                    </p>
                    <p style={styles.hint}>
                      Message is encrypted. Click decrypt to view the content.
                    </p>
                    <MessageDecryptor 
                      message={message} 
                      onDecrypted={handleMessageDecrypted}
                    />
                  </div>
                )}
              </div>
              
              <div style={styles.messageFooter}>
                <span style={styles.messageId}>Message ID: {message.id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  messageCount: {
    color: '#666',
    fontSize: '0.9rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    textAlign: 'center' as const,
  },
  messageList: {
    flex: 1,
    overflow: 'auto',
    padding: '1rem',
  },
  noMessages: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    textAlign: 'center' as const,
  },
  messageItem: {
    marginBottom: '1rem',
    padding: '1rem',
    borderRadius: '8px',
    maxWidth: '70%',
    wordWrap: 'break-word' as const,
  },
  ownMessage: {
    backgroundColor: '#e3f2fd',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px',
  },
  otherMessage: {
    backgroundColor: '#f5f5f5',
    marginRight: 'auto',
    borderBottomLeftRadius: '4px',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.8rem',
  },
  sender: {
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    color: '#666',
  },
  messageContent: {
    marginBottom: '0.5rem',
  },
  decryptedText: {
    margin: 0,
    color: '#333',
    lineHeight: 1.4,
  },
  encryptedText: {
    margin: '0 0 0.5rem 0',
    color: '#666',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    backgroundColor: '#f0f0f0',
    padding: '0.5rem',
    borderRadius: '4px',
  },
  hint: {
    margin: 0,
    color: '#888',
    fontSize: '0.8rem',
    fontStyle: 'italic',
  },
  messageFooter: {
    fontSize: '0.7rem',
    color: '#999',
  },
  messageId: {
    fontSize: '0.7rem',
    color: '#999',
  },
};