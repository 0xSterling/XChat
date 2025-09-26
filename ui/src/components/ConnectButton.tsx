import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

export const ConnectButton = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
      <RainbowConnectButton />
    </div>
  );
};