import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { type PublicClient } from 'viem';
import { ethers } from 'ethers';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useToast } from './Toast';
import { XCOIN_ADDRESS, XCOIN_ABI } from '../config/contracts';

function short(addr?: string | null) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function WalletFloat() {
  const { address, isConnected } = useAccount();
  const viemClient = usePublicClient() as PublicClient;
  const signerPromise = useEthersSigner();
  const { instance: fhe } = useZamaInstance();
  const { show } = useToast();

  const [open, setOpen] = useState(false);
  const [sym, setSym] = useState('XCOIN');
  const [decimals, setDecimals] = useState<number>(6);
  const [encBal, setEncBal] = useState<string>('');
  const [decBal, setDecBal] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const ready = isConnected && !!address && !!XCOIN_ADDRESS;

  useEffect(() => {
    (async () => {
      try {
        if (!XCOIN_ADDRESS) return;
        const s = await viemClient.readContract({ address: XCOIN_ADDRESS as `0x${string}`, abi: XCOIN_ABI as any, functionName: 'symbol', args: [] }) as string;
        const d = await viemClient.readContract({ address: XCOIN_ADDRESS as `0x${string}`, abi: XCOIN_ABI as any, functionName: 'decimals', args: [] }) as number;
        setSym(s);
        setDecimals(Number(d));
      } catch {}
    })();
  }, [viemClient]);

  const fetchEncBalance = async () => {
    if (!address || !XCOIN_ADDRESS) return;
    const handle = await viemClient.readContract({
      address: XCOIN_ADDRESS as `0x${string}`,
      abi: XCOIN_ABI as any,
      functionName: 'confidentialBalanceOf',
      args: [address as `0x${string}`],
    }) as string;
    setEncBal(handle);
    setDecBal('');
  };

  useEffect(() => { if (ready) fetchEncBalance(); }, [address, ready]);

  const decrypt = async () => {
    if (!fhe || !address || !encBal || !XCOIN_ADDRESS || !signerPromise) return;
    try {
      setBusy(true);

      // Optimization: if encrypted balance is all zeros, directly return 0
      const zeroEncrypted = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (encBal === zeroEncrypted || encBal === '0x00' || encBal === '0x0') {
        setDecBal('0');
        show('Balance is 0 (optimized)');
        return;
      }

      show('Decrypting balance...');
      const keyPair = fhe.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [XCOIN_ADDRESS];
      const signer = await signerPromise;
      const eip712 = fhe.createEIP712(keyPair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain as any,
        { UserDecryptRequestVerification: (eip712 as any).types.UserDecryptRequestVerification },
        eip712.message as any,
      );
      const result = await fhe.userDecrypt(
        [{ handle: encBal, contractAddress: XCOIN_ADDRESS }],
        keyPair.privateKey,
        keyPair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        await signer.getAddress(),
        startTimeStamp,
        durationDays,
      );
      const value = (result as any)[encBal] as string; // uint64 as string
      // Format using token decimals
      const big = ethers.toBigInt(value || '0');
      const formatted = Number(big) / 10 ** decimals;
      setDecBal(String(formatted));
      show('Decrypted');
    } catch (e: any) {
      show(e?.message || 'Decrypt failed');
    } finally { setBusy(false); }
  };

  const faucet = async () => {
    if (!signerPromise || !XCOIN_ADDRESS) return;
    try {
      setBusy(true);
      show('Requesting faucet...');
      const signer = await signerPromise;
      const token = new ethers.Contract(XCOIN_ADDRESS, XCOIN_ABI, signer);
      const tx = await token.faucet();
      await tx.wait();
      await fetchEncBalance();
      show('Faucet minted');
    } catch (e: any) {
      show(e?.message || 'Faucet failed');
    } finally { setBusy(false); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '50px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-whatsapp-green)',
          color: 'white',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          zIndex: 1100,
        }}
        title="Wallet"
      >
        💼
      </button>

      {/* Wallet panel */}
      {open && (
        <div style={{
          position: 'fixed',
          right: '20px',
          bottom: '86px',
          width: '300px',
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '12px',
          zIndex: 1100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>My Wallet</div>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
          </div>

          {!XCOIN_ADDRESS && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 8 }}>
              XCoin not configured. Set XCOIN_ADDRESS after deploy.
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Address</div>
          <div style={{ marginBottom: 10 }}>{short(address)}</div>

          {/* <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Token</div>
          <div style={{ marginBottom: 10 }}>{sym}</div> */}

          <div style={{ fontSize: 17, color: 'black' }}>Balance : {decBal ? `${decBal} ${sym}` : '*** XCoin'}</div>
          <div style={{fontSize:13}}>Confidential XCoin, just for test, sending tips.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={decrypt}
              disabled={!encBal || busy || !fhe}
              style={{
                flex: 1,
                background: encBal ? 'var(--color-whatsapp-green)' : 'var(--color-gray-300)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 10px',
                cursor: encBal && !busy ? 'pointer' : 'default',
              }}
            >
              {busy ? '...' : 'Decrypt'}
            </button>
            <button
              onClick={faucet}
              disabled={!XCOIN_ADDRESS || busy || !signerPromise}
              style={{
                width: 100,
                background: '#444',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 10px',
                cursor: XCOIN_ADDRESS && !busy ? 'pointer' : 'default',
              }}
            >
              Faucet
            </button>
          </div>

          {/* <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>Decrypted</div>
          <div style={{ marginBottom: 4 }}>{decBal ? `${decBal} ${sym}` : '–'}</div> */}
        </div>
      )}
    </>
  );
}
