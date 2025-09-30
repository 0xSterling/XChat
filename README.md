# XChat - Encrypted Group Chat on Blockchain

<div align="center">

![XChat Logo](https://img.shields.io/badge/XChat-Encrypted%20Chat-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

[![License](https://img.shields.io/badge/License-BSD--3--Clause--Clear-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-e6e6e6?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)
[![FHEVM](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-purple)](https://www.zama.ai/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev/)

**A fully encrypted group chat platform leveraging Fully Homomorphic Encryption (FHE) on Ethereum**

[Features](#features) • [Demo](#demo) • [Architecture](#architecture) • [Quick Start](#quick-start) • [Technology Stack](#technology-stack) • [Documentation](#documentation)

</div>

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Problems Solved](#problems-solved)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Development](#development)
  - [Deployment](#deployment)
- [Smart Contracts](#smart-contracts)
- [Frontend Application](#frontend-application)
- [Security Model](#security-model)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Advantages](#advantages)
- [Use Cases](#use-cases)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## 🌟 Overview

**XChat** is a decentralized, privacy-preserving group chat application built on Ethereum using **Fully Homomorphic Encryption (FHE)** technology from [Zama.ai](https://www.zama.ai/). Unlike traditional blockchain messaging systems where data is publicly visible, XChat ensures that group passwords and message contents remain completely encrypted on-chain while still enabling full smart contract functionality.

The platform combines the transparency and immutability of blockchain technology with military-grade encryption, creating a truly private and censorship-resistant communication protocol.

### What Makes XChat Unique?

- **On-Chain Encryption**: Group passwords stored as encrypted addresses using FHE
- **Zero-Knowledge Communication**: Messages encrypted with AES-256 using FHE-derived keys
- **Fully Decentralized**: No central servers, all data lives on Ethereum
- **WhatsApp-Style UX**: Familiar, intuitive interface for mainstream adoption
- **Confidential Tokens**: Built-in encrypted token (XCoin) for in-app donations
- **Permissionless**: Anyone can create groups and join without gatekeepers

---

## ✨ Key Features

### 🔐 Cryptographic Features

1. **FHE-Encrypted Group Passwords**
   - Each group has a unique password stored as an encrypted Ethereum address
   - Passwords are never exposed in plaintext on-chain
   - Only group members can decrypt the password using Zama's FHE protocol
   - Automatic ACL (Access Control List) management for key distribution

2. **End-to-End Encrypted Messages**
   - Messages are AES-256-GCM encrypted client-side before being sent to the blockchain
   - Encryption keys are derived from FHE-decrypted group passwords
   - Even the smart contract cannot read message contents

3. **Confidential Token Support**
   - **ConfidentialXCoin**: A fully encrypted ERC-20 token using Zama's FHE
   - Enables private donations to group creators
   - Balances and transfers are fully confidential

### 💬 Chat Features

- **Group Creation**: Create unlimited groups with custom names and auto-generated encrypted passwords
- **Open Join Model**: Anyone can join any group (customizable for private groups)
- **Real-Time Updates**: WebSocket-based event listening for instant message delivery
- **Message History**: All messages stored on-chain for permanent accessibility
- **Member Management**: Track group membership and member counts
- **Pagination Support**: Efficient loading of large message histories

### 🎨 User Interface

- **WhatsApp-Inspired Design**: Clean, modern UI with familiar chat patterns
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Wallet Integration**: RainbowKit integration for easy wallet connection
- **Toast Notifications**: Non-intrusive status updates
- **Color-Coded Avatars**: Unique colors generated from wallet addresses
- **Message Bubbles**: Distinct styling for sent vs. received messages

### 💰 Token Integration

- **XCoin Faucet**: Get test tokens for donations
- **Confidential Transfers**: Donate encrypted tokens to group creators
- **Balance Privacy**: Token balances hidden from public view

---

## 🎯 Problems Solved

### 1. **Privacy Leakage in Public Blockchains**

**Problem**: Traditional blockchain applications expose all data publicly, making them unsuitable for private communication.

**Solution**: XChat uses FHE to encrypt sensitive data (passwords, balances) at the smart contract level, and AES encryption for message content. This ensures that even though data is on-chain, it remains private.

### 2. **Centralized Messaging Platforms**

**Problem**: Platforms like WhatsApp, Telegram, and Discord are centralized, vulnerable to censorship, data breaches, and single points of failure.

**Solution**: XChat is fully decentralized. Messages are stored on Ethereum, eliminating central servers and making the platform censorship-resistant and immune to platform shutdowns.

### 3. **Key Distribution in Encrypted Systems**

**Problem**: Secure key distribution is one of the hardest problems in cryptography. How do you share encryption keys with group members without exposing them?

**Solution**: XChat uses FHE to store encrypted group passwords on-chain. When users join a group, they're automatically granted decryption rights through the FHE ACL system, solving the key distribution problem elegantly.

### 4. **Trust in Messaging Apps**

**Problem**: Users must trust messaging platforms not to read their messages, even in "end-to-end encrypted" systems.

**Solution**: XChat's encryption happens entirely client-side, and the smart contract code is open-source and immutable. No trust required—users can verify the code themselves.

### 5. **Data Permanence and Ownership**

**Problem**: Centralized platforms can delete messages, ban users, or shut down entirely, causing data loss.

**Solution**: All messages are permanently stored on Ethereum. Users truly own their data, and it cannot be deleted or modified by any third party.

### 6. **Confidential Transactions**

**Problem**: Token transfers on public blockchains reveal sender, recipient, and amount, compromising financial privacy.

**Solution**: XCoin uses Zama's confidential token standard, keeping all transaction details private while maintaining blockchain auditability for the owner.

---

## 🛠️ Technology Stack

### Smart Contract Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Solidity** | 0.8.24 / 0.8.27 | Smart contract programming language |
| **Hardhat** | ^2.26.0 | Ethereum development environment |
| **@fhevm/solidity** | ^0.8.0 | Zama's FHE library for Solidity |
| **@zama-fhe/oracle-solidity** | ^0.1.0 | FHE oracle integration |
| **new-confidential-contracts** | ^0.1.1 | Confidential token standards |
| **TypeChain** | ^8.3.2 | TypeScript bindings for contracts |
| **Hardhat Deploy** | ^0.11.45 | Deployment management |

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^19.1.1 | UI framework |
| **TypeScript** | ~5.8.3 | Type-safe JavaScript |
| **Vite** | ^7.1.6 | Build tool and dev server |
| **ethers.js** | ^6.15.0 | Ethereum interaction library |
| **wagmi** | ^2.17.0 | React hooks for Ethereum |
| **viem** | ^2.37.6 | TypeScript Ethereum library |
| **RainbowKit** | ^2.2.8 | Wallet connection UI |
| **@tanstack/react-query** | ^5.89.0 | Async state management |
| **@zama-fhe/relayer-sdk** | ^0.2.0 | FHE relayer integration |

### Cryptography

| Technology | Purpose |
|------------|---------|
| **Zama FHEVM** | Fully Homomorphic Encryption on Ethereum |
| **AES-256-GCM** | Client-side message encryption |
| **Web Crypto API** | Browser-native cryptographic operations |
| **EIP-712** | Typed data signing for FHE key pairs |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Ethereum Sepolia Testnet** | Deployment target |
| **IPFS** (future) | Decentralized file storage |
| **The Graph** (future) | Blockchain data indexing |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   React UI   │  │  Web Crypto  │  │  Wallet (MetaMask)│  │
│  │  (WhatsApp   │  │   (AES-256)  │  │                  │  │
│  │   Style)     │  │              │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Ethereum Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            XChat Smart Contract                       │   │
│  │  • FHE-encrypted group passwords (eaddress)          │   │
│  │  • AES-encrypted messages (string)                   │   │
│  │  • Group metadata (name, owner, members)             │   │
│  │  • ACL management (FHE.allow)                        │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────┴───────────────────────────────────┐   │
│  │     ConfidentialXCoin (ERC-20 with FHE)              │   │
│  │  • Encrypted balances (euint64)                      │   │
│  │  • Confidential transfers                            │   │
│  │  • Faucet for testing                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Zama FHE Coprocessor                        │
│  • ACL Contract (0x6878...9b6c)                             │
│  • Coprocessor (0x848B...8595)                              │
│  • Decryption Oracle (0xa02C...8812)                        │
│  • KMS Verifier (0x1364...acAC)                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Creating a Group

```
1. User inputs group name
2. Generate random Ethereum address as password
3. Encrypt password with FHE (eaddress)
4. Submit to XChat.createGroup(name, encryptedPassword, proof)
5. Contract stores encrypted password and grants ACL to creator
6. Emit GroupCreated event
```

#### Joining a Group

```
1. User clicks "Join" on a group
2. Call XChat.joinGroup(groupId)
3. Contract sets isMember[groupId][user] = true
4. Contract grants FHE decryption rights: FHE.allow(encPassword, user)
5. Emit GroupJoined event
```

#### Sending a Message

```
1. User clicks "Load Key" button
2. Client requests encrypted password handle from contract
3. Client generates FHE keypair and signs EIP-712 message
4. Client calls Zama relayer to decrypt password → cleartext address
5. Derive AES-256 key from address using PBKDF2
6. Store key locally (state)
7. User types message
8. Encrypt message with AES-256-GCM (produces {iv, data})
9. Send JSON.stringify({iv, data}) to XChat.sendMessage()
10. Contract stores encrypted string on-chain
11. Emit MessageSent event
```

#### Reading Messages

```
1. Client subscribes to MessageSent events for groupId
2. For each message, fetch ciphertext from contract
3. Parse JSON to get {iv, data}
4. Decrypt with stored AES key → plaintext message
5. Render in UI
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 7.0.0
- **Git**
- **MetaMask** or another Web3 wallet
- **Sepolia ETH**: For deploying and testing (get from [faucet](https://sepoliafaucet.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/xchat.git
cd xchat

# Install dependencies
npm install

# Install UI dependencies
cd ui
npm install
cd ..
```

### Configuration

1. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Wallet Configuration
PRIVATE_KEY=your_private_key_here
MNEMONIC=your twelve word mnemonic phrase here

# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
INFURA_API_KEY=your_infura_api_key

# Optional: Etherscan API for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. **Configure Hardhat variables (alternative to .env)**

```bash
npx hardhat vars setup
```

Follow the prompts to set:
- `MNEMONIC`
- `ETHERSCAN_API_KEY`

### Development

#### Compile Smart Contracts

```bash
npm run compile
```

This compiles contracts and generates TypeChain types.

#### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run on Sepolia testnet
npm run test:sepolia
```

#### Start Local Frontend

```bash
# Start local blockchain (in one terminal)
npx hardhat node

# Deploy contracts locally (in another terminal)
npx hardhat deploy --network localhost

# Start frontend dev server
cd ui
npm run dev
```

Open http://localhost:5173 in your browser.

### Deployment

#### Deploy to Sepolia Testnet

```bash
# Deploy XChat contract
npm run deploy:sepolia

# Deploy with automatic config update (recommended)
npm run deploy:sepolia:full
```

This will:
1. Deploy XChat.sol
2. Deploy ConfidentialXCoin.sol
3. Update frontend config with contract addresses
4. Output deployment addresses

#### Update Frontend Config

After deployment, update `ui/src/config/contracts.ts` with your contract addresses:

```typescript
export const XCHAT_ADDRESS = '0xYourXChatAddress';
export const XCOIN_ADDRESS = '0xYourXCoinAddress';
```

#### Deploy Frontend

```bash
cd ui
npm run build

# Deploy dist/ folder to your hosting service
# (Netlify, Vercel, IPFS, etc.)
```

---

## 📜 Smart Contracts

### XChat.sol

Main contract for group chat functionality.

#### Key Functions

```solidity
// Create a new group with encrypted password
function createGroup(
    string calldata name,
    externalEaddress passwordInput,
    bytes calldata inputProof
) external returns (uint256 groupId)

// Join an existing group
function joinGroup(uint256 groupId) external

// Get group information
function getGroup(uint256 groupId)
    external view
    returns (string memory name, address owner, uint256 createdAt, uint256 memberCount)

// Get encrypted group password handle
function getGroupPassword(uint256 groupId)
    external view
    returns (eaddress)

// Send an encrypted message
function sendMessage(uint256 groupId, string calldata ciphertext)
    external

// Get message history
function getMessages(uint256 groupId, uint256 offset, uint256 limit)
    external view
    returns (address[] memory senders, string[] memory ciphertexts, uint256[] memory timestamps)
```

#### Events

```solidity
event GroupCreated(uint256 indexed groupId, string name, address indexed owner);
event GroupJoined(uint256 indexed groupId, address indexed member);
event MessageSent(uint256 indexed groupId, address indexed sender, string ciphertext, uint256 timestamp);
```

### ConfidentialXCoin.sol

Confidential ERC-20 token for in-app donations.

#### Key Functions

```solidity
// Mint tokens to yourself (testnet only)
function faucet() external

// Confidential transfer
function confidentialTransfer(
    address to,
    bytes32 encryptedAmount,
    bytes calldata inputProof
) external
```

---

## 💻 Frontend Application

### Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── XChatApp.tsx       # Main chat list component
│   │   ├── Toast.tsx           # Toast notification system
│   │   └── WalletFloat.tsx     # Floating wallet display
│   ├── pages/
│   │   └── GroupPage.tsx       # Individual group chat page
│   ├── hooks/
│   │   ├── useEthersSigner.ts  # Convert wagmi client to ethers signer
│   │   ├── useZamaInstance.ts  # Initialize Zama FHE SDK
│   │   └── crypto.ts           # AES encryption/decryption utilities
│   ├── config/
│   │   ├── contracts.ts        # Contract addresses and ABIs
│   │   └── wagmi.ts            # Wagmi/RainbowKit configuration
│   ├── styles/
│   │   └── whatsapp.css        # WhatsApp-inspired styles
│   ├── App.tsx                 # Root component with routing
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── package.json
└── vite.config.ts
```

### Key Components

#### XChatApp.tsx

Displays the list of all available groups with:
- Real-time group count updates
- Membership status indicators
- Group creation modal
- WhatsApp-style list UI

#### GroupPage.tsx

Individual group chat interface with:
- Message history loading from contract storage
- Real-time message listening via WebSocket events
- FHE key decryption flow
- AES message encryption/decryption
- Donation modal for sending XCoin to group creators
- Message bubbles with sender identification

#### Crypto Utilities

```typescript
// Derive AES key from FHE-decrypted address
async function deriveAesKeyFromAddress(address: string): Promise<CryptoKey>

// Encrypt message with AES-256-GCM
async function encryptMessage(key: CryptoKey, plaintext: string): Promise<{iv: string, data: string}>

// Decrypt message
async function decryptMessage(key: CryptoKey, encrypted: {iv: string, data: string}): Promise<string>
```

---

## 🔒 Security Model

### Threat Model

XChat is designed to protect against:

1. **Passive Observers**: Anyone reading the blockchain cannot see group passwords or message contents
2. **Malicious Nodes**: Ethereum validators cannot decrypt sensitive data
3. **Contract Exploits**: FHE ensures even contract vulnerabilities don't expose plaintext data
4. **Man-in-the-Middle**: All encryption happens client-side with user-controlled keys

### Security Guarantees

✅ **Group Password Confidentiality**: Stored as FHE-encrypted addresses, only decryptable by group members

✅ **Message Confidentiality**: AES-256-GCM encryption with keys derived from FHE passwords

✅ **Forward Secrecy**: Each group has a unique password; compromise of one doesn't affect others

✅ **Access Control**: FHE ACL system ensures only authorized users can decrypt passwords

✅ **Immutability**: All data stored on Ethereum cannot be altered or deleted

✅ **Censorship Resistance**: No central authority can block users or delete groups

### Security Limitations

⚠️ **Group Join Model**: Current implementation uses open join (anyone can join). Private groups require additional access control logic.

⚠️ **Key Management**: Users must manually "load" the decryption key each session. No persistent key storage (by design for security).

⚠️ **Client-Side Security**: If a user's device is compromised, their messages can be decrypted. Standard client-side security practices apply.

⚠️ **Blockchain Finality**: Messages have typical Ethereum block confirmation delays (~12-15 seconds).

⚠️ **No Message Deletion**: Once sent, messages are permanent on-chain.

---

## 🧪 Testing

### Test Structure

```
test/
├── XChat.test.ts          # XChat contract unit tests
└── ConfidentialXCoin.test.ts  # XCoin contract unit tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/XChat.test.ts

# Run with gas reporting
REPORT_GAS=true npm test

# Run with coverage
npm run coverage
```

### Test Coverage

The test suite covers:
- Group creation with FHE encryption
- Membership management
- ACL permission grants
- Message sending and retrieval
- Pagination of message history
- XCoin faucet and transfers
- Edge cases and error conditions

---

## 📁 Project Structure

```
XChat/
├── contracts/                  # Solidity smart contracts
│   ├── XChat.sol               # Main chat contract
│   └── ConfidentialXCoin.sol   # Confidential token
├── deploy/                     # Hardhat deployment scripts
│   ├── 01_deploy_xchat.ts
│   └── 02_deploy_xcoin.ts
├── test/                       # Contract tests
│   ├── XChat.test.ts
│   └── ConfidentialXCoin.test.ts
├── tasks/                      # Hardhat tasks
│   ├── accounts.ts
│   ├── FHECounter.ts
│   └── XChat.ts
├── ui/                         # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── types/                      # TypeChain generated types
├── artifacts/                  # Compiled contracts
├── cache/                      # Hardhat cache
├── docs/                       # Documentation
│   ├── zama_doc_relayer.md
│   └── zama_llm.md
├── .env                        # Environment variables (gitignored)
├── hardhat.config.ts           # Hardhat configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎖️ Advantages

### Compared to Centralized Messengers (WhatsApp, Telegram, Discord)

| Feature | XChat | Traditional Apps |
|---------|-------|------------------|
| **Censorship Resistance** | ✅ Fully decentralized | ❌ Can ban users/groups |
| **Data Ownership** | ✅ User owns all data | ❌ Platform owns data |
| **Server Shutdowns** | ✅ Immune (on blockchain) | ❌ Can go offline permanently |
| **Privacy from Platform** | ✅ Platform can't read messages | ⚠️ Must trust platform |
| **Permanent Records** | ✅ Immutable on-chain | ❌ Can be deleted |
| **Open Source** | ✅ Fully auditable | ⚠️ Usually proprietary |

### Compared to Other Web3 Messengers

| Feature | XChat | Others |
|---------|-------|--------|
| **On-Chain Encryption** | ✅ FHE at contract level | ⚠️ Usually off-chain or IPFS |
| **No IPFS Dependency** | ✅ Fully on Ethereum | ⚠️ Rely on IPFS availability |
| **Automatic Key Distribution** | ✅ FHE ACL system | ❌ Manual key sharing |
| **Encrypted Tokens** | ✅ Built-in FHE tokens | ❌ Standard tokens |
| **Group Password Security** | ✅ FHE-encrypted addresses | ⚠️ Various methods |

### Unique Advantages

1. **True Privacy**: FHE ensures computational privacy—even the blockchain cannot see sensitive data
2. **No Servers**: Eliminates hosting costs, maintenance, and single points of failure
3. **Composability**: Smart contract primitives can be integrated into other dApps
4. **Auditability**: All code is open-source and on-chain
5. **Micro-Donations**: Built-in confidential token enables creator support
6. **Progressive Decentralization**: Can start with simple features and add DAO governance later

---

## 💡 Use Cases

### 1. Privacy-Focused Communities

**Scenario**: Activist groups, journalists, whistleblowers need censorship-resistant, private communication.

**How XChat Helps**: Messages cannot be intercepted, traced, or censored by governments or corporations.

### 2. DAO Communication

**Scenario**: Decentralized organizations need on-chain communication channels tied to governance.

**How XChat Helps**: Chat groups can be programmatically tied to token holdings or governance participation.

### 3. NFT Community Chats

**Scenario**: NFT projects want token-gated chats for holders.

**How XChat Helps**: Add token-gating logic to `joinGroup()` function (requires holding specific NFT).

### 4. Encrypted Customer Support

**Scenario**: Web3 projects need to provide private support channels.

**How XChat Helps**: Create support groups with encrypted conversation history.

### 5. Confidential Business Communication

**Scenario**: Companies need blockchain-based communication with guaranteed privacy.

**How XChat Helps**: FHE ensures competitors or chain analysts cannot read business discussions.

### 6. Donation-Based Content

**Scenario**: Community leaders want to monetize groups without subscriptions.

**How XChat Helps**: Built-in XCoin donations allow supporters to tip creators privately.

---

## 🗺️ Roadmap

### Phase 1: Foundation (Completed ✅)

- [x] XChat smart contract with FHE encryption
- [x] ConfidentialXCoin token
- [x] React frontend with WhatsApp-style UI
- [x] RainbowKit wallet integration
- [x] AES message encryption
- [x] Real-time event listening
- [x] Sepolia testnet deployment

### Phase 2: Enhanced Features (Q2 2025)

- [ ] **Private Groups**: Add invite-only group functionality
- [ ] **Admin Controls**: Group owner can remove members
- [ ] **File Sharing**: Upload encrypted files to IPFS, share links in chat
- [ ] **Emoji Reactions**: React to messages with emojis
- [ ] **Read Receipts**: Track which members have seen messages
- [ ] **User Profiles**: ENS name integration, custom avatars
- [ ] **Group Icons**: Upload custom group images

### Phase 3: Advanced Encryption (Q3 2025)

- [ ] **Rotating Keys**: Implement periodic key rotation for forward secrecy
- [ ] **Multi-Sig Groups**: Require multiple admins to approve changes
- [ ] **Message Expiry**: Self-destructing messages after time period
- [ ] **Backup & Recovery**: Encrypted key backup to IPFS with recovery phrase
- [ ] **Cross-Chain Support**: Deploy to Polygon, Arbitrum, Optimism

### Phase 4: Social Features (Q4 2025)

- [ ] **Threads**: Reply to specific messages
- [ ] **Mentions**: @user notifications
- [ ] **Link Previews**: Display metadata for shared URLs
- [ ] **GIF Support**: Integrate Giphy or similar
- [ ] **Voice Messages**: Upload encrypted audio to IPFS
- [ ] **Video Calls**: Integrate WebRTC for P2P encrypted calls

### Phase 5: Monetization & Scaling (2026)

- [ ] **Premium Features**: Paid tiers with more storage, groups, etc.
- [ ] **Token-Gated Groups**: Require NFT or token holdings to join
- [ ] **Ads (Optional)**: Encrypted, user-controlled ad system
- [ ] **DAO Governance**: Community votes on features and treasury
- [ ] **Layer 2 Migration**: Move to zkSync or StarkNet for lower fees
- [ ] **Mobile Apps**: React Native iOS/Android apps

### Phase 6: Ecosystem (Future)

- [ ] **XChat SDK**: JavaScript library for integrating XChat into other dApps
- [ ] **Bots & Integrations**: Allow bots to post notifications
- [ ] **Bridges**: Cross-chain messaging between L1s and L2s
- [ ] **Decentralized Relayer Network**: Remove dependency on Zama's centralized relayer
- [ ] **Formal Security Audit**: Third-party audit of contracts
- [ ] **Bug Bounty Program**: Incentivize security researchers

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Bugs

If you find a bug, please open an issue with:
- Detailed description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable
- Your browser/wallet/environment details

### Suggesting Features

Have an idea? Open a feature request issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (if you have ideas)

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write/update tests as needed
5. Run linters: `npm run lint`
6. Run tests: `npm test`
7. Commit with clear messages: `git commit -m "Add feature: your feature"`
8. Push to your fork: `git push origin feature/your-feature-name`
9. Open a Pull Request with:
   - Description of changes
   - Related issue numbers
   - Testing done

### Development Guidelines

- Follow existing code style (Prettier/ESLint configs provided)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep PRs focused and atomic

### Code of Conduct

Be respectful, inclusive, and constructive. We're building together.

---

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**.

See [LICENSE](LICENSE) file for full details.

### What this means:

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No patent rights granted
- ⚠️ Must include copyright notice
- ⚠️ Must include license text

---

## 🙏 Acknowledgments

### Core Technologies

- **[Zama.ai](https://www.zama.ai/)**: For pioneering FHEVM technology and making on-chain encryption possible
- **[Ethereum Foundation](https://ethereum.org/)**: For creating the decentralized platform we build on
- **[Hardhat](https://hardhat.org/)**: For the excellent developer tooling
- **[RainbowKit](https://www.rainbowkit.com/)**: For beautiful wallet connection UX

### Inspiration

- **WhatsApp**: UI/UX inspiration for mainstream appeal
- **Signal**: Privacy-first messaging philosophy
- **Status**: Web3 messaging pioneering work
- **XMTP**: Decentralized messaging research

### Community

Thank you to all contributors, testers, and users who make XChat possible. Special thanks to:

- Early testers who provided invaluable feedback
- The Zama developer community for FHE guidance
- The Ethereum developer community for endless resources

---

## 📞 Contact & Support

- **Website**: [Coming Soon]
- **Documentation**: [docs.xchat.app](https://github.com/yourusername/xchat/wiki)
- **Twitter**: [@XChatProtocol](https://twitter.com/xchatprotocol)
- **Discord**: [Join Community](https://discord.gg/xchat)
- **Email**: support@xchat.app

### Need Help?

- Check the [Documentation](https://github.com/yourusername/xchat/wiki)
- Search [Issues](https://github.com/yourusername/xchat/issues)
- Ask in [Discord](https://discord.gg/xchat)
- Review [FAQ](https://github.com/yourusername/xchat/wiki/FAQ)

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/xchat?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/xchat?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/xchat)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/xchat)
![GitHub last commit](https://img.shields.io/github/last-commit/yourusername/xchat)

---

<div align="center">

**Built with ❤️ by the XChat Team**

[⬆ Back to Top](#xchat---encrypted-group-chat-on-blockchain)

</div>