import { useEffect, useMemo, useRef, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { decryptMessage, encryptMessage, deriveAesKeyFromAddress } from '../hooks/crypto';
import { Header } from '../components/Header';

type MessageEvent = {
  id: string;
  args: { groupId: bigint; sender: `0x${string}`; ciphertext: string; timestamp: bigint };
};

export function GroupPage({ groupId }: { groupId: number }) {
  const { address, isConnected } = useAccount();
  const { instance: fhe } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [groupInfo, setGroupInfo] = useState<{ name: string; owner: `0x${string}`; createdAt: bigint; memberCount: bigint } | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [keyStatus, setKeyStatus] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const viemClient = useMemo(() => createPublicClient({ chain: sepolia, transport: http() }), []);

  async function loadHeaderAndMembership() {
    const [name, owner, createdAt, memberCount] = await viemClient.readContract({
      address: XCHAT_ADDRESS as `0x${string}`,
      abi: XCHAT_ABI as any,
      functionName: 'getGroup',
      args: [BigInt(groupId)],
    }) as [string, `0x${string}`, bigint, bigint];
    setGroupInfo({ name, owner, createdAt, memberCount });

    if (address) {
      const m = await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getIsMember',
        args: [BigInt(groupId), address as `0x${string}`],
      }) as boolean;
      setIsMember(m);
    } else setIsMember(false);
  }

  async function loadHistory() {
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
      .map(l => ({ id: `${l.transactionHash}:${l.logIndex}`, args: l.args })) as MessageEvent[];
    // de-dup on full reload
    const uniq: MessageEvent[] = [];
    const ns = new Set(seen.current);
    for (const ev of parsed) { if (!ns.has(ev.id)) { ns.add(ev.id); uniq.push(ev); } }
    seen.current = ns;
    setEvents(uniq);
  }

  useEffect(() => { loadHeaderAndMembership(); loadHistory(); }, [address, groupId]);

  useEffect(() => {
    let unwatch: (() => void) | null = null;
    (async () => {
      unwatch = await viemClient.watchEvent({
        address: XCHAT_ADDRESS as `0x${string}`,
        event: {
          type: 'event', name: 'MessageSent', inputs: [
            { indexed: true, name: 'groupId', type: 'uint256' },
            { indexed: true, name: 'sender', type: 'address' },
            { indexed: false, name: 'ciphertext', type: 'string' },
            { indexed: false, name: 'timestamp', type: 'uint256' },
          ] } as const,
        onLogs: (logs: any[]) => {
          const filtered = logs
            .filter((l) => Number(l.args.groupId) === groupId)
            .map((l) => ({ id: `${l.transactionHash}:${l.logIndex}`, args: l.args }));
          if (!filtered.length) return;
          const ns = new Set(seen.current);
          const add: MessageEvent[] = [];
          for (const ev of filtered) { if (!ns.has(ev.id)) { ns.add(ev.id); add.push(ev); } }
          if (add.length) {
            seen.current = ns;
            setEvents((prev) => [...prev, ...add]);
          }
        },
      });
    })();
    return () => { if (unwatch) unwatch(); };
  }, [groupId, viemClient]);

  const join = async () => {
    if (!isConnected || !signerPromise) return;
    const signer = await signerPromise;
    const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);
    const tx = await contract.joinGroup(groupId);
    await tx.wait();
    await loadHeaderAndMembership();
  };

  const loadKey = async () => {
    if (!isConnected || !address || !fhe || !signerPromise) return;
    setKeyStatus('Loading...');
    try {
      const handle = await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getGroupPassword',
        args: [BigInt(groupId)],
      }) as string;

      const keyPair = fhe.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [XCHAT_ADDRESS];

      const signer = await signerPromise;
      const eip712 = fhe.createEIP712(keyPair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain as any,
        { UserDecryptRequestVerification: (eip712 as any).types.UserDecryptRequestVerification },
        eip712.message as any,
      );

      const result = await fhe.userDecrypt(
        [{ handle, contractAddress: XCHAT_ADDRESS }],
        keyPair.privateKey,
        keyPair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        await signer.getAddress(),
        startTimeStamp,
        durationDays,
      );
      const clearAddr = (result as any)[handle] as string;
      const key = await deriveAesKeyFromAddress(clearAddr);
      setGroupKey(key);
      setKeyStatus('Key loaded');
    } catch (e: any) {
      setKeyStatus(e?.message || 'Failed to load key');
    }
  };

  const send = async () => {
    if (!message || !signerPromise) return;
    if (!groupKey) { alert('请先load key用来加密信息'); return; }
    setSending(true);
    try {
      const blob = await encryptMessage(groupKey, message);
      const signer = await signerPromise;
      const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);
      const tx = await contract.sendMessage(groupId, JSON.stringify(blob));
      await tx.wait();
      setMessage('');
    } finally { setSending(false); }
  };

  // Render decrypted or redacted
  const [rendered, setRendered] = useState<{ sender: string; text: string }[]>([]);
  const last = useRef(0);
  useEffect(() => { last.current = 0; setRendered([]); }, [groupId]);
  useEffect(() => {
    (async () => {
      const slice = events.slice(last.current);
      const out: { sender: string; text: string }[] = [];
      for (const ev of slice) {
        if (groupKey && isMember) {
          try {
            const parsed = JSON.parse(ev.args.ciphertext);
            const plain = await decryptMessage(groupKey, parsed);
            out.push({ sender: ev.args.sender, text: plain });
          } catch { out.push({ sender: ev.args.sender, text: '***' }); }
        } else {
          out.push({ sender: ev.args.sender, text: '***' });
        }
      }
      if (out.length) { setRendered(prev => [...prev, ...out]); last.current = events.length; }
    })();
  }, [events, groupKey, isMember, groupId]);

  const createdText = groupInfo ? new Date(Number(groupInfo.createdAt) * 1000).toLocaleString() : '-';
  const membersText = groupInfo ? groupInfo.memberCount.toString() : '-';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Header />
      <main style={{ padding: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => { window.location.hash = '#/'; }}>Back</button>
        </div>
        <div style={{ padding: '8px 0', borderBottom: '1px solid #eee', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Group #{groupId}: {groupInfo?.name ?? ''}</div>
          <div style={{ color: '#666', fontSize: 13 }}>Members: {membersText} • Created: {createdText}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isMember ? <button onClick={join}>Join</button> : <button disabled>Joined</button>}
          <button onClick={loadKey}>Load Key</button>
          <span>{keyStatus}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input placeholder={isMember ? 'Type a message' : 'Join to send messages'} value={message} onChange={(e)=>setMessage(e.target.value)} disabled={!isMember} style={{ flex: 1, minWidth: 240, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <button onClick={send} disabled={!message || sending || !isMember}>Send</button>
        </div>
        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
          {rendered.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 8 }}>
              <strong style={{ marginRight: 8 }}>{m.sender}</strong>
              <span>{m.text}</span>
            </div>
          ))}
          {rendered.length === 0 && <div style={{ color: '#888' }}>No messages yet.</div>}
        </div>
      </main>
    </div>
  );
}
