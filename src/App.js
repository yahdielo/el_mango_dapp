import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutUs from './components/aboutUs.js';
import SwapBox from './components/swapBox.js';
import Header from './components/header.js';
import Tokenomics from './components/tokenomics.js';
import ReferralHistory from './components/ReferralHistory.js';
import RewardDashboard from './components/RewardDashboard.js';
import SwapHistory from './components/SwapHistory.js';
import ChainStatusDashboard from './components/ChainStatusDashboard.js';
import CrossChainSwap from './components/CrossChainSwap.js';
//import mangoMiniLogo from "./imgs/mangoMiniLogo.png"
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
    return (
        <Router>
            <div className="App">
                {/* Header*/}
                <Header />
                {/* Centered Box */}
                <div
                    className="Body"
                    expand="lg"
                    style={{
                        background: 'linear-gradient(150deg,red,orange, yellow, green)', // Gradient background
                    }}
                >
                    {/**re route to about us */}
                    <Routes>
                        <Route path="/" element={<SwapBox />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route path="/tokenomics" element={<Tokenomics />} />
                        <Route path="/referrals" element={<ReferralHistory />} />
                        <Route path="/rewards" element={<RewardDashboard />} />
                        <Route path="/swaps" element={<SwapHistory />} />
                        <Route path="/cross-chain" element={<CrossChainSwap />} />
                        <Route path="/chains" element={<ChainStatusDashboard />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
