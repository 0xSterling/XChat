import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, usePublicClient } from 'wagmi';
import { parseEventLogs } from 'viem';
import { XCHAT_ABI, XCHAT_CONTRACT_ADDRESS } from '../utils/contract';
import { Group, Message, ChatState } from '../types';

export const useXChat = () => {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  const [state, setState] = useState<ChatState>({
    groups: [],
    messages: [],
    currentGroup: null,
    isLoading: false,
  });

  // Read total groups
  const { data: totalGroups, refetch: refetchTotalGroups } = useReadContract({
    address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
    abi: XCHAT_ABI,
    functionName: 'getTotalGroups',
  });

  // Read total messages
  const { data: totalMessages, refetch: refetchTotalMessages } = useReadContract({
    address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
    abi: XCHAT_ABI,
    functionName: 'getTotalMessages',
  });

  // Create a new group
  const createGroup = useCallback(async (name: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await writeContract({
        address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI,
        functionName: 'createGroup',
        args: [name],
      });
      
      // Refresh groups after creation
      setTimeout(() => {
        refetchTotalGroups();
        loadGroups();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [address, writeContract, refetchTotalGroups]);

  // Join a group
  const joinGroup = useCallback(async (groupId: number) => {
    if (!address) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await writeContract({
        address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI,
        functionName: 'joinGroup',
        args: [BigInt(groupId)],
      });
      
      // Refresh groups after joining
      setTimeout(() => {
        loadGroups();
      }, 2000);
      
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [address, writeContract]);

  // Send message to group
  const sendMessage = useCallback(async (
    groupId: number, 
    encryptedMessage: string, 
    encryptedPasswordHandle: string, 
    inputProof: string
  ) => {
    if (!address) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await writeContract({
        address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI,
        functionName: 'sendMessage',
        args: [
          BigInt(groupId), 
          encryptedMessage, 
          encryptedPasswordHandle as any, 
          inputProof as `0x${string}`
        ],
      });
      
      // Refresh messages after sending
      setTimeout(() => {
        refetchTotalMessages();
        loadMessages();
      }, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [address, writeContract, refetchTotalMessages]);

  // Load all groups
  const loadGroups = useCallback(async () => {
    if (!totalGroups || !publicClient) return;
    
    const groups: Group[] = [];
    
    for (let i = 0; i < Number(totalGroups); i++) {
      try {
        const groupInfo = await publicClient.readContract({
          address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
          abi: XCHAT_ABI,
          functionName: 'getGroupInfo',
          args: [BigInt(i)],
        }) as [string, string, bigint, bigint];

        const members = await publicClient.readContract({
          address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
          abi: XCHAT_ABI,
          functionName: 'getGroupMembers',
          args: [BigInt(i)],
        }) as string[];

        groups.push({
          id: i,
          name: groupInfo[0],
          creator: groupInfo[1],
          memberCount: Number(groupInfo[2]),
          messageCount: Number(groupInfo[3]),
          members,
        });
      } catch (error) {
        console.error(`Error loading group ${i}:`, error);
      }
    }
    
    setState(prev => ({ ...prev, groups }));
  }, [totalGroups, publicClient]);

  // Load all messages
  const loadMessages = useCallback(async () => {
    if (!totalMessages || !publicClient) return;
    
    const messages: Message[] = [];
    
    for (let i = 0; i < Number(totalMessages); i++) {
      try {
        const messageData = await publicClient.readContract({
          address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
          abi: XCHAT_ABI,
          functionName: 'getMessage',
          args: [BigInt(i)],
        }) as [bigint, string, string, bigint, bigint];

        messages.push({
          id: i,
          groupId: Number(messageData[0]),
          sender: messageData[1],
          encryptedMessage: messageData[2],
          encryptedPasswordAddress: messageData[3].toString(),
          timestamp: Number(messageData[4]),
        });
      } catch (error) {
        // User might not have access to this message
        console.warn(`Cannot access message ${i}:`, error);
      }
    }
    
    setState(prev => ({ ...prev, messages }));
  }, [totalMessages, publicClient]);

  // Check if user is member of a group
  const isMemberOf = useCallback(async (groupId: number): Promise<boolean> => {
    if (!address || !publicClient) return false;
    
    try {
      const result = await publicClient.readContract({
        address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI,
        functionName: 'isMember',
        args: [BigInt(groupId), address],
      });
      return result as boolean;
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  }, [address, publicClient]);

  // Listen for events
  const startEventListener = useCallback(() => {
    if (!publicClient) return;

    const unwatch = publicClient.watchContractEvent({
      address: XCHAT_CONTRACT_ADDRESS as `0x${string}`,
      abi: XCHAT_ABI,
      eventName: 'MessageSent',
      onLogs: (logs) => {
        console.log('New message events:', logs);
        // Refresh messages when new ones are sent
        setTimeout(() => {
          refetchTotalMessages();
          loadMessages();
        }, 1000);
      },
    });

    return unwatch;
  }, [publicClient, refetchTotalMessages, loadMessages]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up event listener
  useEffect(() => {
    const unwatch = startEventListener();
    return unwatch;
  }, [startEventListener]);

  return {
    state,
    createGroup,
    joinGroup,
    sendMessage,
    isMemberOf,
    setCurrentGroup: (groupId: number | null) => 
      setState(prev => ({ ...prev, currentGroup: groupId })),
    refetch: () => {
      refetchTotalGroups();
      refetchTotalMessages();
    },
  };
};