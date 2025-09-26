import { useEffect, useState } from 'react';
import { type PublicClient } from 'viem';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount, usePublicClient } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';

type GroupItem = { id: number; name: string; owner: string; createdAt: bigint; memberCount: bigint; member: boolean };

function ChatList(props: {
  allGroups: GroupItem[];
  onOpen: (id: number) => void;
  onCreateGroup: () => void;
}) {
  const { allGroups, onOpen, onCreateGroup } = props;

  function colorFromAddress(addr: string) {
    let h = 0;
    for (let i = 2; i < Math.min(addr.length, 10); i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
    const r = 120 + (h & 0x7F);
    const g = 120 + ((h >> 7) & 0x7F);
    const b = 120 + ((h >> 14) & 0x7F);
    return `rgb(${r}, ${g}, ${b})`;
  }


  function getLastMessage(groupId: number) {
    // 模拟最后一条消息
    const messages = [
      "Hey everyone! 👋",
      "How's the project going?",
      "Let's discuss the next steps",
      "Great work team! 🎉",
      "See you in the meeting",
      "Thanks for the update 👍"
    ];
    return messages[groupId % messages.length];
  }

  function getTimeAgo(groupId: number) {
    const times = ['now', '2m', '1h', '3h', '1d', '2d'];
    return times[groupId % times.length];
  }

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      {/* WhatsApp-style header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-whatsapp-green)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: '600' }}>
          XChat
        </h1>
        <button
          onClick={onCreateGroup}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '2.5rem',
            height: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          ➕
        </button>
      </div>

      {/* Chat list */}
      <div>
        {allGroups.length > 0 ? (
          allGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => onOpen(group.id)}
              style={{
                padding: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border-light)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: colorFromAddress(group.owner),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-lg)',
                fontWeight: '600',
                color: 'white',
                flexShrink: 0
              }}>
                {group.name.charAt(0).toUpperCase()}
              </div>

              {/* Chat info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-1)'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: 'var(--text-base)',
                    fontWeight: '500',
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {group.name}
                  </h3>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    flexShrink: 0
                  }}>
                    {getTimeAgo(group.id)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {getLastMessage(group.id)}
                  </p>

                  {/* Member status */}
                  {group.member && (
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      background: 'var(--color-whatsapp-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 'var(--space-2)',
                      flexShrink: 0
                    }}>
                      <span style={{
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: '600'
                      }}>
                        ✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Member count */}
                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginTop: 'var(--space-1)'
                }}>
                  {group.memberCount.toString()} members
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            padding: 'var(--space-16)',
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>💬</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: '500', marginBottom: 'var(--space-2)' }}>
              Loading All Chats...
            </div>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              You can also create your new group
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Group Modal Component
function CreateGroupModal({ isOpen, onClose, onCreate, createBusy }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  createBusy: boolean;
}) {
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        margin: 'var(--space-4)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{
          margin: 0,
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--text-xl)',
          fontWeight: '600'
        }}>
          Create New Group
        </h2>

        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-base)'
          }}
        />

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              background: 'var(--color-gray-200)',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (groupName.trim()) {
                onCreate(groupName.trim());
                setGroupName('');
              }
            }}
            disabled={!groupName.trim() || createBusy}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              background: createBusy ? 'var(--color-gray-400)' : 'var(--color-whatsapp-green)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)'
            }}
          >
            {createBusy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function XChatApp() {
  const { address, isConnected } = useAccount();
  const { instance: fhe } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const [allGroups, setAllGroups] = useState<Array<{ id: number; name: string; owner: string; createdAt: bigint; memberCount: bigint; member: boolean }>>([]);

  const viemClient = usePublicClient() as PublicClient;

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
    } catch {}
  }

  useEffect(() => { refreshGroups(); }, [address]);

  // Per-group messages are handled in GroupPage

  // Watch live events for active group
  // No live subscription here

  const createGroup = async (name: string) => {
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

      const tx = await contract.createGroup(name, encrypted.handles[0], encrypted.inputProof);
      const rc = await tx.wait();
      let newId: number | null = null;
      try {
        const iface = new ethers.Interface(XCHAT_ABI as any);
        for (const log of rc!.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'GroupCreated') {
              newId = Number(parsed.args.groupId);
              break;
            }
          } catch {}
        }
      } catch {}
      setShowCreateModal(false);
      await refreshGroups();
      if (newId != null) {
        window.location.hash = `#/group/${newId}`;
      }
    } finally {
      setCreateBusy(false);
    }
  };

  // No message decryption on the list page

  const openGroup = (id: number) => { window.location.hash = `#/group/${id}`; };

  // Detail page moved to GroupPage

  return (
    <>
      {/* Remove the main header since ChatList has its own */}
      <ChatList
        allGroups={allGroups}
        onOpen={openGroup}
        onCreateGroup={() => setShowCreateModal(true)}
      />

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createGroup}
        createBusy={createBusy}
      />
    </>
  );
}
