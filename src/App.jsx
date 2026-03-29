import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppKitProvider } from './providers/AppKitProvider';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import ReownSetupBanner from './components/ReownSetupBanner';
import ReferralUrlCapture from './components/ReferralUrlCapture';
import SwapPage from './pages/SwapPage';
import CrossChainPage from './pages/CrossChainPage';
import ReferralPage from './pages/ReferralPage';
import WhitelistAdminPage from './pages/WhitelistAdminPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TelegramPage from './pages/TelegramPage';
import NotFoundPage from './pages/NotFoundPage';

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
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/telegram" element={<TelegramPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppKitProvider>
  );
}
