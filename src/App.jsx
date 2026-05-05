import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppKitProvider } from './providers/AppKitProvider';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import ReownSetupBanner from './components/ReownSetupBanner';
import ReferralUrlCapture from './components/ReferralUrlCapture';
import TermsGate from './components/TermsGate';
import SwapPage from './pages/SwapPage';
import CrossChainPage from './pages/CrossChainPage';
import ReferralPage from './pages/ReferralPage';
import WhitelistAdminPage from './pages/WhitelistAdminPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import TelegramPage from './pages/TelegramPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import HistoryPage from './pages/HistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import GlobalNav from './components/GlobalNav';

export default function App() {
  useTelegramWebApp();
  return (
    <AppKitProvider>
      <ReownSetupBanner />
      <BrowserRouter>
        <ReferralUrlCapture />
        <GlobalNav />
        <TermsGate>
          <Routes>
            <Route path="/" element={<SwapPage />} />
            <Route path="/cross-chain" element={<CrossChainPage />} />
            <Route path="/referral" element={<ReferralPage />} />
            <Route path="/whitelist-admin" element={<WhitelistAdminPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/agent" element={<AgentDashboardPage />} />
            <Route path="/telegram" element={<TelegramPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </TermsGate>
      </BrowserRouter>
    </AppKitProvider>
  );
}
