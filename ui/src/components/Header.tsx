import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import '../styles/Header.css';

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              💬
            </div>
            <h1 className="header-title">XChat</h1>
            <div className="header-badge">
              Beta
            </div>
          </div>

          <div className="header-connect-wrapper">
            {isConnected && (
              <div className="header-status">
                <div className="header-status-dot"></div>
                Connected
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
