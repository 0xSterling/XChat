// XChat contract ABI - simplified for frontend use
export const XCHAT_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "createGroup",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "groupId", "type": "uint256"}],
    "name": "joinGroup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"internalType": "string", "name": "encryptedMessage", "type": "string"},
      {"internalType": "externalEaddress", "name": "encryptedPasswordAddress", "type": "uint256"},
      {"internalType": "bytes", "name": "inputProof", "type": "bytes"}
    ],
    "name": "sendMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "groupId", "type": "uint256"}],
    "name": "getGroupInfo",
    "outputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
      {"internalType": "uint256", "name": "messageCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "groupId", "type": "uint256"}],
    "name": "getGroupMembers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "isMember",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "messageId", "type": "uint256"}],
    "name": "getMessage",
    "outputs": [
      {"internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"internalType": "address", "name": "sender", "type": "address"},
      {"internalType": "string", "name": "encryptedMessage", "type": "string"},
      {"internalType": "eaddress", "name": "encryptedPasswordAddress", "type": "uint256"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalGroups",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalMessages",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"}
    ],
    "name": "GroupCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "member", "type": "address"}
    ],
    "name": "MemberJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "messageId", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "groupId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "encryptedMessage", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "MessageSent",
    "type": "event"
  }
] as const;

// Contract address - this should be updated after deployment
export const XCHAT_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Update after deployment