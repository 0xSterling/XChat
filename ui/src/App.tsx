import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from './config/wagmi';
import { XChatApp } from './components/XChatApp';
import { GroupPage } from './pages/GroupPage';
import { ToastProvider } from './components/Toast';

const queryClient = new QueryClient();

function App() {
  const [route, setRoute] = useState<{ name: 'home' } | { name: 'group'; id: number }>(() => parseHash());

  function parseHash() {
    const h = window.location.hash || '#/';
    const m = h.match(/^#\/(group)\/(\d+)/);
    if (m) return { name: 'group', id: parseInt(m[2], 10) } as const;
    return { name: 'home' } as const;
  }

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          <ToastProvider>
            <div style={{ minHeight: '100vh' }}>
              {route.name === 'home' ? <XChatApp /> : <GroupPage groupId={route.id} />}
            </div>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App
