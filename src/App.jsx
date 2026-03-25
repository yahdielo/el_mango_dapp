import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppKitProvider } from './providers/AppKitProvider';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import ReownSetupBanner from './components/ReownSetupBanner';
import ReferralUrlCapture from './components/ReferralUrlCapture';
import SwapPage from './pages/SwapPage';
import CrossChainPage from './pages/CrossChainPage';
import ReferralPage from './pages/ReferralPage';
import WhitelistAdminPage from './pages/WhitelistAdminPage';
import TelegramPage from './pages/TelegramPage';

export default function App() {
  useTelegramWebApp();
  return (
    <AppKitProvider>
      <ReownSetupBanner />
      <BrowserRouter>
        <ReferralUrlCapture />
        <Routes>
          <Route path="/" element={<SwapPage />} />
          <Route path="/cross-chain" element={<CrossChainPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/whitelist-admin" element={<WhitelistAdminPage />} />
          <Route path="/telegram" element={<TelegramPage />} />
        </Routes>
      </BrowserRouter>
    </AppKitProvider>
  );
}
