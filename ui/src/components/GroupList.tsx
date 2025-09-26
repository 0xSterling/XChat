import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Group } from '../types';

interface GroupListProps {
  groups: Group[];
  currentGroup: number | null;
  onSelectGroup: (groupId: number) => void;
  onCreateGroup: (name: string) => Promise<void>;
  onJoinGroup: (groupId: number) => Promise<void>;
  isLoading: boolean;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  currentGroup,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  isLoading,
}) => {
  const { address } = useAccount();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      await onCreateGroup(newGroupName);
      setNewGroupName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      await onJoinGroup(groupId);
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group. Please try again.');
    }
  };

  const isUserMember = (group: Group) => {
    return address && group.members?.includes(address);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Groups</h2>
        <button 
          style={styles.createButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={isLoading}
        >
          {showCreateForm ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateGroup} style={styles.createForm}>
          <input
            type="text"
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            style={styles.input}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={isLoading || !newGroupName.trim()}
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div style={styles.groupList}>
        {groups.length === 0 ? (
          <p style={styles.emptyState}>No groups available</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              style={{
                ...styles.groupItem,
                ...(currentGroup === group.id ? styles.selectedGroup : {}),
              }}
            >
              <div style={styles.groupInfo}>
                <h3 style={styles.groupName}>{group.name}</h3>
                <p style={styles.groupDetails}>
                  Creator: {group.creator.slice(0, 6)}...{group.creator.slice(-4)}
                </p>
                <p style={styles.groupDetails}>
                  Members: {group.memberCount} | Messages: {group.messageCount}
                </p>
              </div>
              
              <div style={styles.groupActions}>
                {isUserMember(group) ? (
                  <button
                    style={styles.selectButton}
                    onClick={() => onSelectGroup(group.id)}
                  >
                    {currentGroup === group.id ? 'Selected' : 'Select'}
                  </button>
                ) : (
                  <button
                    style={styles.joinButton}
                    onClick={() => handleJoinGroup(group.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Joining...' : 'Join'}
                  </button>
                )}
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
    width: '300px',
    borderRight: '1px solid #e0e0e0',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  createForm: {
    padding: '1rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  groupList: {
    flex: 1,
    overflow: 'auto',
    padding: '0.5rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#666',
    padding: '2rem',
  },
  groupItem: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white',
  },
  selectedGroup: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  groupInfo: {
    marginBottom: '0.5rem',
  },
  groupName: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1.1rem',
  },
  groupDetails: {
    margin: '0.2rem 0',
    color: '#666',
    fontSize: '0.9rem',
  },
  groupActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  selectButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  joinButton: {
    backgroundColor: '#FF9800',
    color: 'white',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};