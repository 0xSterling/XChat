import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './Header';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { decryptMessage, encryptMessage, deriveAesKeyFromAddress } from '../hooks/crypto';

type MessageEvent = {
  args: { groupId: bigint; sender: `0x${string}`; ciphertext: string; timestamp: bigint }
};

export function XChatApp() {
  const { address, isConnected } = useAccount();
  const { instance: fhe } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [groupName, setGroupName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<number>(1);

  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [keyStatus, setKeyStatus] = useState<string>('');

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [events, setEvents] = useState<MessageEvent[]>([]);

  const viemClient = useMemo(() => createPublicClient({ chain: sepolia, transport: http() }), []);

  // Ethers write contract
  const ethersContract = null; // using useEthersSigner for signer

  // Watch MessageSent events for the active group
  useEffect(() => {
    let unwatch: (() => void) | null = null;
    (async () => {
      try {
        const filter = {
          address: XCHAT_ADDRESS as `0x${string}`,
          event: {
            inputs: [
              { indexed: true, name: 'groupId', type: 'uint256' },
              { indexed: true, name: 'sender', type: 'address' },
              { indexed: false, name: 'ciphertext', type: 'string' },
              { indexed: false, name: 'timestamp', type: 'uint256' },
            ],
            name: 'MessageSent',
            type: 'event',
          } as const,
        } as const;

        // Fetch recent logs
        const logs = await viemClient.getLogs({
          address: XCHAT_ADDRESS as `0x${string}`,
          event: filter.event,
          fromBlock: 'latest',
          toBlock: 'latest',
        });
        // Start watch
        unwatch = await viemClient.watchEvent({
          address: XCHAT_ADDRESS as `0x${string}`,
          event: filter.event,
          onLogs: (logs: any[]) => {
            const parsed = logs
              .map((l) => ({ args: l.args }))
              .filter((e) => Number(e.args.groupId) === Number(activeGroupId));
            if (parsed.length) setEvents((prev) => [...prev, ...parsed]);
          },
        });
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      if (unwatch) unwatch();
    };
  }, [activeGroupId, viemClient]);

  const createGroup = async () => {
    if (!isConnected || !address || !fhe || !signerPromise) return;
    setCreateBusy(true);
    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);

      // Generate address-like password
      const wallet = ethers.Wallet.createRandom();
      const password = wallet.address;

      const buffer = fhe.createEncryptedInput(XCHAT_ADDRESS, address);
      buffer.addAddress(password);
      const encrypted = await buffer.encrypt();

      const tx = await contract.createGroup(groupName, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      setGroupName('');
    } finally {
      setCreateBusy(false);
    }
  };

  const joinGroup = async () => {
    if (!isConnected || !signerPromise) return;
    setJoinBusy(true);
    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);
      const tx = await contract.joinGroup(activeGroupId);
      await tx.wait();
    } finally {
      setJoinBusy(false);
    }
  };

  const loadGroupKey = async () => {
    if (!isConnected || !address || !fhe || !signerPromise) return;
    setKeyStatus('Loading...');
    try {
      // Read encrypted eaddress via viem
      const data = await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getGroupPassword',
        args: [BigInt(activeGroupId)],
      });
      const handle = data as string; // bytes32 handle

      // User decrypt via relayer SDK
      const keyPair = fhe.generateKeypair();
      const handleContractPairs = [
        { handle, contractAddress: XCHAT_ADDRESS },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [XCHAT_ADDRESS];

      // Request EIP-712 signature via ethers signer
      const signer = await signerPromise;
      const eip712 = fhe.createEIP712(keyPair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain as any,
        { UserDecryptRequestVerification: (eip712 as any).types.UserDecryptRequestVerification },
        eip712.message as any,
      );

      const result = await fhe.userDecrypt(
        handleContractPairs,
        keyPair.privateKey,
        keyPair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        await signer.getAddress(),
        startTimeStamp,
        durationDays,
      );

      const clearAddr = (result as any)[handle] as string; // decrypted address string
      const key = await deriveAesKeyFromAddress(clearAddr);
      setGroupKey(key);
      setKeyStatus('Key loaded');
    } catch (e: any) {
      setKeyStatus(e?.message || 'Failed to load key');
    }
  };

  const send = async () => {
    if (!groupKey || !message || !signerPromise) return;
    setSending(true);
    try {
      const blob = await encryptMessage(groupKey, message);
      const signer = await signerPromise;
      const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);
      const tx = await contract.sendMessage(activeGroupId, JSON.stringify(blob));
      await tx.wait();
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const decryptedMessages = useMemo(() => {
    if (!groupKey) return [] as { sender: string; text: string }[];
    return events.map((e) => ({ sender: e.args.sender, text: '' }))
  }, [events, groupKey]);

  // Attempt to decrypt displayed messages on render
  const [renderedMessages, setRenderedMessages] = useState<{ sender: string; text: string }[]>([]);
  const lastCount = useRef(0);
  useEffect(() => {
    (async () => {
      if (!groupKey) { setRenderedMessages([]); return; }
      const slice = events.slice(lastCount.current);
      const out: { sender: string; text: string }[] = [];
      for (const ev of slice) {
        try {
          const parsed = JSON.parse(ev.args.ciphertext);
          const plain = await decryptMessage(groupKey, parsed);
          out.push({ sender: ev.args.sender, text: plain });
        } catch {
          out.push({ sender: ev.args.sender, text: '(unable to decrypt)' });
        }
      }
      if (out.length) {
        setRenderedMessages((prev) => [...prev, ...out]);
        lastCount.current = events.length;
      }
    })();
  }, [events, groupKey]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Header />
      <main style={{ padding: 16 }}>
        <section style={{ marginBottom: 24 }}>
          <h2>Groups</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
            />
            <button onClick={createGroup} disabled={!groupName || createBusy} style={{ padding: '8px 12px' }}>Create</button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(parseInt(e.target.value || '1', 10))}
              style={{ padding: 8, width: 120, border: '1px solid #ddd', borderRadius: 6 }}
            />
            <button onClick={joinGroup} disabled={joinBusy} style={{ padding: '8px 12px' }}>Join Group</button>
            <button onClick={loadGroupKey} style={{ padding: '8px 12px' }}>Load Key</button>
            <span>{keyStatus}</span>
          </div>
        </section>

        <section>
          <h2>Messages</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ flex: 1, minWidth: 240, padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
            />
            <button onClick={send} disabled={!groupKey || !message || sending} style={{ padding: '8px 12px' }}>Send</button>
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
            {renderedMessages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: 8 }}>
                <strong style={{ marginRight: 8 }}>{m.sender}</strong>
                <span>{m.text}</span>
              </div>
            ))}
            {renderedMessages.length === 0 && <div style={{ color: '#888' }}>No messages yet.</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
