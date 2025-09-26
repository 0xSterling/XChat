import { useEffect, useRef, useState } from 'react';
import { type PublicClient } from 'viem';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount, usePublicClient } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { decryptMessage, encryptMessage, deriveAesKeyFromAddress } from '../hooks/crypto';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
  const [, setKeyStatus] = useState('');
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
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-chat)'
    }}>
      {/* WhatsApp-style chat header */}
      <div style={{
        background: 'var(--color-whatsapp-green)',
        color: 'white',
        padding: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0
      }}>
        {/* Back button */}
        <button
          onClick={() => { window.location.hash = '#/'; }}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 'var(--text-lg)',
            cursor: 'pointer',
            padding: 'var(--space-1)',
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>

        {/* Group avatar */}
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colorFromAddress(groupInfo?.owner || '')}, ${colorFromAddress((groupInfo?.owner || '') + '1')})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-base)',
            fontWeight: '600',
            color: 'white',
            flexShrink: 0
          }}
        >
          {groupInfo?.name ? groupInfo.name.charAt(0).toUpperCase() : '#'}
        </div>

        {/* Group info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--text-base)',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {groupInfo?.name || 'Loading...'}
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            opacity: 0.8,
            marginTop: '1px'
          }}>
            {membersText} members
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {!isMember ? (
            <button
              onClick={join}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer'
              }}
            >
              Join
            </button>
          ) : null}

          <button
            onClick={loadKey}
            style={{
              background: groupKey ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer'
            }}
          >
            {groupKey ? '🔓' : '🔐'}
          </button>
          <ConnectButton />
        </div>
      </div>

      {/* Messages area - WhatsApp style */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-4) var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }}>
        {/* Encryption status */}
        {!groupKey && isMember && (
          <div style={{
            background: 'rgba(255, 243, 205, 0.8)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            textAlign: 'center',
            color: '#8b5a2b',
            margin: '0 var(--space-2)'
          }}>
            🔐 Load your key to decrypt and send messages
          </div>
        )}

        {/* Messages */}
        {rendered.length > 0 ? (
          rendered.map((m, idx) => {
            const isOwnMessage = address && m.sender.toLowerCase() === address.toLowerCase();
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                  marginBottom: 'var(--space-2)'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    minWidth: '120px',
                    background: isOwnMessage ? 'var(--color-whatsapp-bubble-out)' : 'var(--color-whatsapp-bubble-in)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  {/* Sender name for other people's messages */}
                  {!isOwnMessage && (
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: '600',
                      color: colorFromAddress(m.sender),
                      marginBottom: 'var(--space-1)'
                    }}>
                      {short(m.sender)}
                    </div>
                  )}

                  {/* Message text */}
                  <div style={{
                    fontSize: 'var(--text-base)',
                    lineHeight: 'var(--leading-normal)',
                    wordBreak: 'break-word',
                    color: m.text === '***' ? 'var(--color-text-muted)' : 'var(--color-text-primary)'
                  }}>
                    {m.text === '***' ? '🔒 Encrypted message' : m.text}
                  </div>

                  {/* Message tail for bubble effect */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      [isOwnMessage ? 'right' : 'left']: '-6px',
                      width: 0,
                      height: 0,
                      borderLeft: isOwnMessage ? '6px solid var(--color-whatsapp-bubble-out)' : '6px solid transparent',
                      borderRight: isOwnMessage ? '6px solid transparent' : '6px solid var(--color-whatsapp-bubble-in)',
                      borderTop: '6px solid transparent',
                      borderBottom: `6px solid ${isOwnMessage ? 'var(--color-whatsapp-bubble-out)' : 'var(--color-whatsapp-bubble-in)'}`
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-12)',
            color: 'var(--color-text-muted)',
            opacity: 0.6
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>💬</div>
            <div style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
              No messages yet
            </div>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              Be the first to start the conversation!
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp-style input area */}
      <div style={{
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-3)',
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'white',
          borderRadius: '25px',
          border: '1px solid var(--color-border)',
          paddingLeft: 'var(--space-4)',
          paddingRight: message.trim() ? 'var(--space-2)' : 'var(--space-4)'
        }}>
          <input
            type="text"
            placeholder={
              !isMember
                ? "Join to send messages"
                : !groupKey
                  ? "Load key to send messages"
                  : "Type a message..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isMember || !groupKey}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: 'var(--space-3) 0',
              fontSize: 'var(--text-base)',
              background: 'transparent'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && message.trim() && !sending && isMember && groupKey) {
                send();
              }
            }}
          />

          {message.trim() && isMember && groupKey && (
            <button
              onClick={send}
              disabled={sending}
              style={{
                background: 'var(--color-whatsapp-green)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                margin: 'var(--space-1)'
              }}
            >
              {sending ? '⏳' : '→'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
