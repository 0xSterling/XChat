import { useEffect, useRef, useState } from 'react';
import { type PublicClient } from 'viem';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount, usePublicClient } from 'wagmi';
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
  const [msgs, setMsgs] = useState<MessageEvent[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [keyStatus, setKeyStatus] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const viemClient = usePublicClient() as PublicClient;

  async function loadHeaderAndMembership() {
    const [name, owner, createdAt, memberCount] = await viemClient.readContract({
      address: XCHAT_ADDRESS as `0x${string}`,
      abi: XCHAT_ABI as any,
      functionName: 'getGroup',
      args: [BigInt(groupId)],
    }) as [string, `0x${string}`, bigint, bigint];
    setGroupInfo({ name, owner, createdAt, memberCount });
    console.log('[Group] header', { groupId, name, owner, createdAt: Number(createdAt), memberCount: Number(memberCount) });
    if (address) {
      const m = await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getIsMember',
        args: [BigInt(groupId), address as `0x${string}`],
      }) as boolean;
      setIsMember(m);
      console.log('[Group] membership', { address, member: m });
    } else setIsMember(false);
  }

  async function loadHistory() {
    try {
      // Read stored messages directly from contract storage
      const count = (await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getMessageCount',
        args: [BigInt(groupId)],
      })) as bigint;
      console.log('[Group] getMessageCount', { groupId, count: Number(count) });
      if (count === 0n) { setMsgs([]); return; }
      const max = 100n; // fetch last up to 100 messages
      const offset = count > max ? count - max : 0n;
      const limit = count - offset;
      console.log('[Group] getMessages params', { offset: Number(offset), limit: Number(limit) });
      const [senders, ciphertexts, timestamps] = (await viemClient.readContract({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        functionName: 'getMessages',
        args: [BigInt(groupId), offset, limit],
      })) as [string[], string[], bigint[]];
      console.log('[Group] getMessages result', { senders: senders.length, ciphertexts: ciphertexts.length, timestamps: timestamps.length });

      // Rebuild the full history from storage on every call
      const mapped: MessageEvent[] = [];
      const ns = new Set<string>();
      for (let i = 0; i < senders.length; i++) {
        const args = { groupId: BigInt(groupId), sender: senders[i] as `0x${string}`, ciphertext: ciphertexts[i], timestamp: timestamps[i] };
        const key = `${args.sender}|${args.ciphertext}|${String(args.timestamp)}`;
        ns.add(key);
        mapped.push({ id: key, args });
      }
      // Seed dedup set with everything we have from storage so the event watcher won't duplicate
      seen.current = ns;
      setMsgs(mapped);
      // Immediately show placeholders to avoid empty state flicker
      setRendered(mapped.map((ev) => ({ sender: ev.args.sender, text: '***' })));
    } catch (e) {
      console.error('[Group] loadHistory error', e);
      setMsgs([]);
    }
  }

  useEffect(() => { loadHeaderAndMembership(); loadHistory(); }, [address, groupId]);

  useEffect(() => {
    let unwatch: (() => void) | null = null;
    (async () => {
      unwatch = await viemClient.watchContractEvent({
        address: XCHAT_ADDRESS as `0x${string}`,
        abi: XCHAT_ABI as any,
        eventName: 'MessageSent',
        onLogs: (logs: any[]) => {
          const filtered = logs.filter((l) => Number(l.args.groupId) === groupId);
          if (!filtered.length) return;
          const ns = new Set(seen.current);
          const add: MessageEvent[] = [];
          for (const l of filtered) {
            const key = `${l.args.sender}|${l.args.ciphertext}|${String(l.args.timestamp)}`;
            if (!ns.has(key)) {
              ns.add(key);
              add.push({ id: key, args: l.args });
              console.log('[Group] new event', { sender: l.args.sender, ts: String(l.args.timestamp) });
            }
          }
          if (add.length) {
            seen.current = ns;
            setMsgs((prev) => [...prev, ...add]);
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
    await loadHistory();
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
      // Decryption effect will re-render messages with plaintext
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
      await loadHistory();
    } finally { setSending(false); }
  };

  // Render decrypted or redacted
  const [rendered, setRendered] = useState<{ sender: string; text: string }[]>([]);
  useEffect(() => {
    (async () => {
      const out = await Promise.all(
        msgs.map(async (ev) => {
          if (groupKey && isMember) {
            try {
              const parsed = JSON.parse(ev.args.ciphertext);
              const plain = await decryptMessage(groupKey, parsed);
              return { sender: ev.args.sender, text: plain };
            } catch {
              return { sender: ev.args.sender, text: '***' };
            }
          }
          return { sender: ev.args.sender, text: '***' };
        })
      );
      setRendered(out);
    })();
  }, [msgs, groupKey, isMember, groupId]);

  const createdText = groupInfo ? new Date(Number(groupInfo.createdAt) * 1000).toLocaleString() : '-';
  const membersText = groupInfo ? groupInfo.memberCount.toString() : '-';

  function short(addr: string) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function colorFromAddress(addr: string) {
    let h = 0;
    for (let i = 2; i < Math.min(addr.length, 10); i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
    const r = 100 + (h & 0x7F);
    const g = 100 + ((h >> 7) & 0x7F);
    const b = 100 + ((h >> 14) & 0x7F);
    return `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: 'var(--space-4)' }}>
      <Header />

      <main style={{ marginTop: 'var(--space-6)' }}>
        {/* Back button */}
        <div className="mb-6">
          <button
            className="secondary"
            onClick={() => { window.location.hash = '#/'; }}
            style={{ fontSize: 'var(--text-sm)' }}
          >
            ← Back to Groups
          </button>
        </div>

        {/* Group header card */}
        <div className="card mb-6">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="flex items-center gap-4 mb-4 flex-mobile-col">
              <div
                className="avatar-mobile"
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: 'var(--radius-lg)',
                  background: `linear-gradient(135deg, ${colorFromAddress(groupInfo?.owner || '')}, ${colorFromAddress((groupInfo?.owner || '') + '1')})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)',
                  fontWeight: '600',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                #{groupId}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ margin: 0, marginBottom: 'var(--space-1)' }}>
                  {groupInfo?.name || 'Loading...'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {groupInfo && (
                      <div
                        style={{
                          width: '1rem',
                          height: '1rem',
                          borderRadius: '50%',
                          background: colorFromAddress(groupInfo.owner)
                        }}
                      />
                    )}
                    <span>Owner: {groupInfo ? short(groupInfo.owner) : '-'}</span>
                  </div>
                  <span>•</span>
                  <span>{membersText} members</span>
                  <span>•</span>
                  <span>Created {createdText}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-4 flex-mobile-col">
              {!isMember ? (
                <button onClick={join} className="mobile-full" style={{ background: 'var(--color-success)' }}>
                  Join Group
                </button>
              ) : (
                <button disabled className="mobile-full" style={{ background: 'var(--color-gray-300)' }}>
                  ✓ Joined
                </button>
              )}

              <button onClick={loadKey} className="secondary mobile-full">
                {groupKey ? '🔓 Key Loaded' : '🔐 Load Key'}
              </button>

              {keyStatus && (
                <span className="text-sm text-gray-600">
                  {keyStatus}
                </span>
              )}
            </div>

            {!groupKey && (
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-primary)'
              }}>
                💡 Load your key to decrypt messages and send new ones
              </div>
            )}
          </div>
        </div>

        {/* Message input card */}
        <div className="card mb-6">
          <div className="flex gap-4 items-end flex-mobile-col">
            <div style={{ flex: 1 }}>
              <label className="text-sm font-medium text-gray-700" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                {isMember ? 'Send a message' : 'Join the group to send messages'}
              </label>
              <input
                type="text"
                placeholder={isMember ? 'Type your message...' : 'Join to send messages'}
                value={message}
                onChange={(e)=>setMessage(e.target.value)}
                disabled={!isMember}
                style={{
                  minHeight: '2.75rem',
                  fontSize: 'var(--text-base)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message && !sending && isMember) {
                    send();
                  }
                }}
              />
            </div>
            <button
              onClick={send}
              disabled={!message || sending || !isMember}
              className="mobile-full"
              style={{
                minHeight: '2.75rem',
                paddingLeft: 'var(--space-6)',
                paddingRight: 'var(--space-6)'
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Messages card */}
        <div className="card">
          <div style={{ marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
            <h2 className="text-lg font-semibold" style={{ margin: 0 }}>Messages</h2>
            <p className="text-sm text-gray-600" style={{ margin: 0, marginTop: 'var(--space-1)' }}>
              {rendered.length} message{rendered.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={{ maxHeight: '32rem', overflowY: 'auto', padding: 'var(--space-2)' }}>
            {rendered.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {rendered.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--color-gray-50)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colorFromAddress(m.sender)}, ${colorFromAddress(m.sender + '1')})`,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-xs)',
                        fontWeight: '600',
                        color: 'white',
                        textShadow: '0 1px 1px rgba(0,0,0,0.2)'
                      }}
                    >
                      {short(m.sender).slice(2, 4).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold text-gray-800" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                        {short(m.sender)}
                      </div>
                      <div style={{
                        color: m.text === '***' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        fontSize: 'var(--text-base)',
                        lineHeight: 'var(--leading-relaxed)',
                        wordBreak: 'break-word'
                      }}>
                        {m.text === '***' ? '***' : m.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-12)',
                color: 'var(--color-text-muted)'
              }}>
                <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-4)' }}>💬</div>
                <div className="text-lg font-medium" style={{ marginBottom: 'var(--space-2)' }}>
                  No messages yet
                </div>
                <div className="text-sm">
                  Be the first to start the conversation!
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
