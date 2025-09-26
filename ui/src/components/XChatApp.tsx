import { useEffect, useState } from 'react';
import { Header } from './Header';
import { type PublicClient } from 'viem';
import { ethers } from 'ethers';
import { XCHAT_ADDRESS, XCHAT_ABI } from '../config/contracts';
import { useAccount, usePublicClient } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';

type GroupItem = { id: number; name: string; owner: string; createdAt: bigint; memberCount: bigint; member: boolean };

function GroupList(props: {
  activeTab: 'groups' | 'create' | 'my';
  setActiveTab: (t: 'groups' | 'create' | 'my') => void;
  allGroups: GroupItem[];
  myGroups: { id: number; name: string }[];
  onOpen: (id: number) => void;
  groupName: string;
  setGroupName: (v: string) => void;
  onCreate: () => Promise<void>;
  createBusy: boolean;
}) {
  const { activeTab, setActiveTab, allGroups, myGroups, onOpen, groupName, setGroupName, onCreate, createBusy } = props;

  function colorFromAddress(addr: string) {
    let h = 0;
    for (let i = 2; i < Math.min(addr.length, 10); i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
    const r = 100 + (h & 0x7F);
    const g = 100 + ((h >> 7) & 0x7F);
    const b = 100 + ((h >> 14) & 0x7F);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function short(addr: string) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 'var(--space-8)',
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-1)',
        border: '1px solid var(--color-border-light)'
      }}>
        {(['groups', 'create', 'my'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: 'var(--space-3) var(--space-4)',
              background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === tab ? '600' : '500',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <span style={{ display: 'inline' }}>
              {tab === 'groups' && (
                <>
                  <span className="hidden-mobile">🌐 All Groups</span>
                  <span className="show-mobile">🌐 Groups</span>
                </>
              )}
              {tab === 'create' && (
                <>
                  <span className="hidden-mobile">➕ Create Group</span>
                  <span className="show-mobile">➕ Create</span>
                </>
              )}
              {tab === 'my' && (
                <>
                  <span className="hidden-mobile">👤 My Groups</span>
                  <span className="show-mobile">👤 Mine</span>
                </>
              )}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'groups' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
              All Groups
            </h2>
            <p className="text-gray-600 text-sm" style={{ margin: 0 }}>
              Discover and join groups in the network
            </p>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {allGroups.map(g => (
              <div key={g.id} className="card" style={{
                padding: 'var(--space-5)',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: 'var(--radius-lg)',
                      background: `linear-gradient(135deg, ${colorFromAddress(g.owner)}, ${colorFromAddress(g.owner + '1')})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '600',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      #{g.id}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" style={{ margin: 0, marginBottom: 'var(--space-1)' }}>
                        {g.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <div style={{
                            width: '0.75rem',
                            height: '0.75rem',
                            borderRadius: '50%',
                            background: colorFromAddress(g.owner)
                          }} />
                          <span>{short(g.owner)}</span>
                        </div>
                        <span>•</span>
                        <span>{g.memberCount.toString()} members</span>
                      </div>
                    </div>
                  </div>

                  {g.member && (
                    <div style={{
                      background: 'var(--color-success)',
                      color: 'white',
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: '500'
                    }}>
                      ✓ Joined
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => onOpen(g.id)}
                    style={{
                      flex: 1,
                      background: 'var(--color-primary)',
                      color: 'white'
                    }}
                  >
                    Open Group
                  </button>
                </div>
              </div>
            ))}

            {allGroups.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-16)',
                color: 'var(--color-text-muted)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🔍</div>
                <div className="text-lg font-medium mb-2">Loading groups...</div>
                <div className="text-sm">Fetching groups from the blockchain</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
              Create New Group
            </h2>
            <p className="text-gray-600 text-sm" style={{ margin: 0 }}>
              Start your own encrypted group chat
            </p>
          </div>

          <div className="card" style={{ maxWidth: '32rem' }}>
            <div style={{
              background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              border: '1px solid var(--color-primary)',
              borderStyle: 'dashed'
            }}>
              <div className="flex items-start gap-3">
                <div style={{ fontSize: 'var(--text-lg)' }}>🔐</div>
                <div>
                  <div className="font-medium text-sm mb-1" style={{ color: 'var(--color-primary)' }}>
                    Fully Homomorphic Encryption
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-primary)', lineHeight: 'var(--leading-relaxed)' }}>
                    Creating a group generates an FHE encrypted key. This process may take 10-30 seconds to complete.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label className="text-sm font-medium text-gray-700" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Group Name
              </label>
              <input
                type="text"
                placeholder="Enter a name for your group..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>

            <button
              onClick={onCreate}
              disabled={!groupName || createBusy}
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                fontSize: 'var(--text-base)',
                background: createBusy ? 'var(--color-gray-400)' : 'var(--color-primary)'
              }}
            >
              {createBusy ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Creating Group...
                </span>
              ) : (
                '🚀 Create Group'
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
              My Groups
            </h2>
            <p className="text-gray-600 text-sm" style={{ margin: 0 }}>
              Groups you've joined
            </p>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {myGroups.map(g => (
              <div key={g.id} className="card" style={{
                padding: 'var(--space-5)',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: 'var(--radius-lg)',
                      background: `linear-gradient(135deg, var(--color-secondary), var(--color-primary))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '600',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      #{g.id}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" style={{ margin: 0 }}>
                        {g.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpen(g.id)}
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white'
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}

            {myGroups.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-16)',
                color: 'var(--color-text-muted)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>👥</div>
                <div className="text-lg font-medium mb-2">No joined groups yet</div>
                <div className="text-sm mb-4">Join a group to start chatting!</div>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="secondary"
                >
                  Browse Groups
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function XChatApp() {
  const { address, isConnected } = useAccount();
  const { instance: fhe } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [activeTab, setActiveTab] = useState<'groups' | 'create' | 'my'>('groups');
  const [groupName, setGroupName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const [allGroups, setAllGroups] = useState<Array<{ id: number; name: string; owner: string; createdAt: bigint; memberCount: bigint; member: boolean }>>([]);
  const [myGroups, setMyGroups] = useState<Array<{ id: number; name: string }>>([]);

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
      setMyGroups(list.filter(g => g.member).map(g => ({ id: g.id, name: g.name })));
    } catch {}
  }

  useEffect(() => { refreshGroups(); }, [address]);

  // Per-group messages are handled in GroupPage

  // Watch live events for active group
  // No live subscription here

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
      setGroupName('');
      if (newId != null) {
        alert('Group created successfully');
        window.location.hash = `#/group/${newId}`;
      } else {
        alert('Group created. Opening list...');
      }
    } finally {
      setCreateBusy(false);
    }
  };

  // No message decryption on the list page

  const openGroup = (id: number) => { window.location.hash = `#/group/${id}`; };

  // Detail page moved to GroupPage

  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', padding: 'var(--space-4)' }}>
      <Header />
      <main style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
            Welcome to XChat
          </h1>
          <p className="text-lg text-gray-600" style={{ margin: 0 }}>
            Secure, encrypted group conversations powered by blockchain technology
          </p>
        </div>

        <GroupList
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          allGroups={allGroups}
          myGroups={myGroups}
          onOpen={openGroup}
          groupName={groupName}
          setGroupName={setGroupName}
          onCreate={async()=>{ await createGroup(); await refreshGroups(); }}
          createBusy={createBusy}
        />
      </main>
    </div>
  );
}
