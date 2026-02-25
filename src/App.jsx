import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppKitProvider } from './providers/AppKitProvider';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import SwapPage from './pages/SwapPage';
import CrossChainPage from './pages/CrossChainPage';

export default function App() {
  useTelegramWebApp();
  return (
    <AppKitProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SwapPage />} />
          <Route path="/cross-chain" element={<CrossChainPage />} />
        </Routes>
      </BrowserRouter>
    </AppKitProvider>
  );
}
