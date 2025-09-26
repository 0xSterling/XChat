import { useEffect, useMemo, useRef, useState } from 'react';
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
  onJoin: (id: number) => Promise<void>;
  groupName: string;
  setGroupName: (v: string) => void;
  onCreate: () => Promise<void>;
  createBusy: boolean;
}) {
  const { activeTab, setActiveTab, allGroups, myGroups, onOpen, onJoin, groupName, setGroupName, onCreate, createBusy } = props;
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
                  <button onClick={() => onOpen(g.id)}>Open</button>
                  {/* <button onClick={() => onJoin(g.id)}>Join</button> */}
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
          <p>Create Group will generate FHE encrypted key. It will take 10-30 seconds.</p>
          <p>Click create and wait...</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Group name" value={groupName} onChange={(e)=>setGroupName(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}/>
            <button onClick={onCreate} disabled={!groupName || createBusy}>Create</button>
          </div>
        </div>
      )}
      {activeTab === 'my' && (
        <div>
          <h2>My Groups</h2>
          {myGroups.map(g => (
            <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>#{g.id}</strong> {g.name}</div>
              <button onClick={()=> onOpen(g.id)}>Open</button>
            </div>
          ))}
          {myGroups.length === 0 && <div style={{ color: '#888' }}>No joined groups.</div>}
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
  const [joinBusy, setJoinBusy] = useState(false);

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
      await tx.wait();
      setGroupName('');
    } finally {
      setCreateBusy(false);
    }
  };

  const joinGroup = async (id: number) => {
    if (!isConnected || !signerPromise) return;
    setJoinBusy(true);
    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(XCHAT_ADDRESS, XCHAT_ABI, signer);
      const tx = await contract.joinGroup(id);
      await tx.wait();
    } finally {
      setJoinBusy(false);
    }
  };
  // No message decryption on the list page

  const openGroup = (id: number) => { window.location.hash = `#/group/${id}`; };

  // Detail page moved to GroupPage

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Header />
      <main style={{ padding: 16 }}>
        <GroupList
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          allGroups={allGroups}
          myGroups={myGroups}
          onOpen={openGroup}
          onJoin={async (id:number)=>{ await joinGroup(id); await refreshGroups(); }}
          groupName={groupName}
          setGroupName={setGroupName}
          onCreate={async()=>{ await createGroup(); await refreshGroups(); }}
          createBusy={createBusy}
        />
      </main>
    </div>
  );
}
