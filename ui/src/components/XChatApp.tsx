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

  const [activeTab, setActiveTab] = useState<'groups' | 'create' | 'my'>('groups');
  const [groupName, setGroupName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [keyStatus, setKeyStatus] = useState<string>('');

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [isMember, setIsMember] = useState<boolean>(false);

  const [allGroups, setAllGroups] = useState<Array<{ id: number; name: string; owner: string; createdAt: bigint; memberCount: bigint; member: boolean }>>([]);
  const [myGroups, setMyGroups] = useState<Array<{ id: number; name: string }>>([]);

  const viemClient = useMemo(() => createPublicClient({ chain: sepolia, transport: http() }), []);

  async function refreshGroups() {
    try {
      const count = (await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'groupCount',
        args: [],
      })) as bigint;
      const ids = Array.from({ length: Number(count) }, (_, i) => i + 1);
      const list = await Promise.all(ids.map(async (id) => {
        const [name, owner, createdAt, memberCount] = await viemClient.readContract({
          address: XCHAT_ADDRESS as `0x${string}`,
          abi: XCHAT_ABI as any,
          functionName: 'getGroup',
          args: [BigInt(id)],
        }) as [string, `0x${string}`, bigint, bigint];
        let member = false;
        if (address) {
          member = await viemClient.readContract({
            address: XCHAT_ADDRESS as `0x${string}`,
            abi: XCHAT_ABI as any,
            functionName: 'getIsMember',
            args: [BigInt(id), address as `0x${string}`],
          }) as boolean;
        }
        return { id, name, owner, createdAt, memberCount, member };
      }));
      setAllGroups(list);
      setMyGroups(list.filter(g => g.member).map(g => ({ id: g.id, name: g.name })));
    } catch {}
  }

  useEffect(() => { refreshGroups(); }, [address]);

  async function loadGroupMessages(groupId: number) {
    try {
      // Check membership
      if (address) {
        const member = await viemClient.readContract({
          address: XCHAT_ADDRESS as `0x${string}`,
          abi: XCHAT_ABI as any,
          functionName: 'getIsMember',
          args: [BigInt(groupId), address as `0x${string}`],
        }) as boolean;
        setIsMember(member);
      } else {
        setIsMember(false);
      }

      // Load historical logs (limited range)
      const latest = await viemClient.getBlockNumber();
      const from = latest > 200000n ? latest - 200000n : 0n;
      const logs = await viemClient.getLogs({
        address: XCHAT_ADDRESS as `0x${string}`,
        event: {
          type: 'event',
          name: 'MessageSent',
          inputs: [
            { indexed: true, name: 'groupId', type: 'uint256' },
            { indexed: true, name: 'sender', type: 'address' },
            { indexed: false, name: 'ciphertext', type: 'string' },
            { indexed: false, name: 'timestamp', type: 'uint256' },
          ],
        } as const,
        fromBlock: from,
        toBlock: 'latest',
      });
      const parsed = (logs as any[])
        .filter(l => Number(l.args.groupId) === groupId)
        .map(l => ({ args: l.args })) as MessageEvent[];
      setEvents(parsed);
    } catch {}
  }

  // Watch live events for active group
  useEffect(() => {
    if (activeGroupId == null) return;
    let unwatch: (() => void) | null = null;
    (async () => {
      try {
        unwatch = await viemClient.watchEvent({
          address: XCHAT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'MessageSent',
            inputs: [
              { indexed: true, name: 'groupId', type: 'uint256' },
              { indexed: true, name: 'sender', type: 'address' },
              { indexed: false, name: 'ciphertext', type: 'string' },
              { indexed: false, name: 'timestamp', type: 'uint256' },
            ],
          } as const,
          onLogs: (logs: any[]) => {
            const filtered = logs.filter(l => Number(l.args.groupId) === activeGroupId).map(l => ({ args: l.args }));
            if (filtered.length) setEvents(prev => [...prev, ...filtered]);
          },
        });
      } catch {}
    })();
    return () => { if (unwatch) unwatch(); };
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
    if (!isConnected || !address || !fhe || !signerPromise || activeGroupId == null) return;
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
    if (!groupKey || !message || !signerPromise || activeGroupId == null) return;
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

  function GroupList() {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={() => setActiveTab('groups')}>Groups</button>
          <button onClick={() => setActiveTab('create')}>Create Group</button>
          <button onClick={() => setActiveTab('my')}>My Groups</button>
        </div>
        {activeTab === 'groups' && (
          <div>
            <h2>Groups</h2>
            <div>
              {allGroups.map(g => (
                <div key={g.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div><strong>#{g.id}</strong> {g.name}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>owner {g.owner} • members {g.memberCount.toString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => { setActiveGroupId(g.id); await loadGroupMessages(g.id); }}>Open</button>
                    <button onClick={async () => { setActiveGroupId(g.id); await joinGroup(); await refreshGroups(); }}>Join</button>
                  </div>
                </div>
              ))}
              {allGroups.length === 0 && <div style={{ color: '#888' }}>No groups yet.</div>}
            </div>
          </div>
        )}
        {activeTab === 'create' && (
          <div>
            <h2>Create Group</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder="Group name" value={groupName} onChange={(e)=>setGroupName(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}/>
              <button onClick={async()=>{ await createGroup(); await refreshGroups(); }} disabled={!groupName || createBusy}>Create</button>
            </div>
          </div>
        )}
        {activeTab === 'my' && (
          <div>
            <h2>My Groups</h2>
            {myGroups.map(g => (
              <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><strong>#{g.id}</strong> {g.name}</div>
                <button onClick={async ()=>{ setActiveGroupId(g.id); await loadGroupMessages(g.id); }}>Open</button>
              </div>
            ))}
            {myGroups.length === 0 && <div style={{ color: '#888' }}>No joined groups.</div>}
          </div>
        )}
      </div>
    );
  }

  function GroupDetail() {
    const [renderedMessages, setRenderedMessages] = useState<{ sender: string; text: string }[]>([]);
    const lastCount = useRef(0);
    useEffect(() => { lastCount.current = 0; setRenderedMessages([]); }, [activeGroupId]);
    useEffect(() => {
      (async () => {
        if (activeGroupId == null) return;
        if (!groupKey || !isMember) {
          // Redact for non-members
          const slice = events.slice(lastCount.current);
          const out = slice.map(ev => ({ sender: ev.args.sender, text: '***' }));
          if (out.length) {
            setRenderedMessages(prev => [...prev, ...out]);
            lastCount.current = events.length;
          }
          return;
        }
        const slice = events.slice(lastCount.current);
        const out: { sender: string; text: string }[] = [];
        for (const ev of slice) {
          try {
            const parsed = JSON.parse(ev.args.ciphertext);
            const plain = await decryptMessage(groupKey, parsed);
            out.push({ sender: ev.args.sender, text: plain });
          } catch { out.push({ sender: ev.args.sender, text: '***' }); }
        }
        if (out.length) {
          setRenderedMessages(prev => [...prev, ...out]);
          lastCount.current = events.length;
        }
      })();
    }, [events, groupKey, isMember, activeGroupId]);

    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={async ()=>{ if (activeGroupId!=null){ await joinGroup(); await refreshGroups(); } }} disabled={joinBusy}>Join</button>
          <button onClick={loadGroupKey}>Load Key</button>
          <span>{keyStatus}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input
            placeholder={isMember ? 'Type a message' : 'Join to send messages'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isMember}
            style={{ flex: 1, minWidth: 240, padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <button onClick={send} disabled={!groupKey || !message || sending || !isMember}>Send</button>
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
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Header />
      <main style={{ padding: 16 }}>
        <GroupList />
        {activeGroupId != null && <GroupDetail />}
      </main>
    </div>
  );
}
