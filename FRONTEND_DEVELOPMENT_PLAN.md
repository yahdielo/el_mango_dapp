# Frontend Development Plan: Stake, Portfolio, Liquidity, Settings

## Overview
This document outlines the development plan for four new mobile-first pages that match the existing Swap interface design and functionality.

---

## 1. STAKE PAGE (`/stake`)

### Purpose
Allow users to stake tokens to earn rewards/APY.

### Features
- **Stake Interface**
  - Token selection (similar to swap token selector)
  - Amount input with "Max" button
  - Current staked balance display
  - Available balance display
  - APY/APR display for selected token
  - Estimated rewards calculator
  - Stake button (similar to "Slide to Swap" style)

- **Staking Pools Display**
  - List of available staking pools
  - Each pool shows: Token, APY, Total Staked, Your Stake
  - Filter/sort options (by APY, token, etc.)

- **Active Stakes**
  - List of user's active stakes
  - Unstake functionality
  - Claim rewards button
  - Staking period/vesting info
  - Pending rewards display

- **Transaction History**
  - Stake transactions
  - Unstake transactions
  - Reward claims
  - Filter by date, token, type

### Components Needed
- `MobileStakeBox.js` - Main container (similar to MobileSwapBox)
- `MobileStakeCard.js` - Stake input card (similar to MobileSwapCard)
- `StakePoolList.js` - List of available pools
- `ActiveStakesList.js` - User's active stakes
- `StakeRewardsDisplay.js` - Rewards calculator and display
- `StakeHistory.js` - Transaction history

### Design Consistency
- Use same header (MobileSwapHeader)
- Same bottom navigation (BottomNavigation)
- Same card styling (white rounded cards with shadows)
- Same button styles (green "Slide to Stake" button)
- Same token selector component (MobileTokenSelector)
- Same error/success toast system

### Integration Points
- `wagmi` hooks: `useAccount`, `useBalance`, `useChainId`
- `chainConfig` service for multi-chain support
- `mangoApi.js` for staking API calls
- Token balance hooks (`useTokenBalance`, `useGetEthBalance`)
- Error handling utilities (`formatErrorForDisplay`)

### API Endpoints Needed
- `GET /api/v1/stake/pools` - Get available staking pools
- `GET /api/v1/stake/user-stakes` - Get user's active stakes
- `POST /api/v1/stake/stake` - Stake tokens
- `POST /api/v1/stake/unstake` - Unstake tokens
- `POST /api/v1/stake/claim-rewards` - Claim rewards
- `GET /api/v1/stake/rewards` - Get pending rewards
- `GET /api/v1/stake/history` - Get staking history

---

## 2. PORTFOLIO PAGE (`/portfolio`)

### Purpose
Display user's complete portfolio: balances, assets, transaction history, and analytics.

### Features
- **Portfolio Overview**
  - Total portfolio value (USD)
  - Total assets count
  - Portfolio breakdown by chain
  - Portfolio breakdown by token type
  - 24h change percentage

- **Asset List**
  - List of all tokens user holds
  - Each shows: Token icon, symbol, balance, USD value, 24h change
  - Sort by: Value, Name, 24h Change
  - Filter by: Chain, Token type
  - Search functionality

- **Chain Breakdown**
  - Tabs for each chain (Base, BSC, Arbitrum, etc.)
  - Chain-specific balances
  - Chain-specific transaction history

- **Transaction History**
  - All transactions across all chains
  - Filter by: Type (Swap, Stake, Liquidity, etc.), Chain, Date
  - Transaction details modal
  - Link to block explorer

- **Analytics**
  - Portfolio value chart (7d, 30d, All time)
  - Top performing assets
  - Recent activity summary

### Components Needed
- `MobilePortfolioBox.js` - Main container
- `PortfolioOverview.js` - Summary cards
- `AssetList.js` - Token list with balances
- `ChainTabs.js` - Chain selector tabs
- `PortfolioChart.js` - Value chart component
- `TransactionHistoryList.js` - Transaction list
- `AssetCard.js` - Individual asset card

### Design Consistency (iOS Style)
- iOS-style navigation bar with large title
- iOS-style tab bar with translucent blur
- iOS-style grouped list layout (rounded corners on sections)
- iOS-style asset cards with separators
- iOS-style loading states (activity indicators, skeleton screens)
- iOS-style empty states with SF Symbols-style icons
- iOS-style error handling (alerts and action sheets)
- Respect safe area for all content

### Integration Points
- `wagmi` hooks for balances across chains
- `chainConfig` for supported chains
- Token list service (`getTokenList`)
- Transaction history from swap/stake/liquidity APIs
- Price API for USD conversions

### API Endpoints Needed
- `GET /api/v1/portfolio/overview` - Portfolio summary
- `GET /api/v1/portfolio/assets` - All user assets
- `GET /api/v1/portfolio/transactions` - All transactions
- `GET /api/v1/portfolio/analytics` - Portfolio analytics
- Price API integration for USD values

---

## 3. LIQUIDITY PAGE (`/liquidity`)

### Purpose
Allow users to add/remove liquidity from pools and manage LP positions.

### Features
- **Add Liquidity**
  - Dual token input (similar to swap)
  - Token pair selector
  - Amount inputs for both tokens
  - Price ratio display
  - Share of pool percentage
  - Estimated LP tokens to receive
  - Slippage tolerance setting
  - Add liquidity button

- **Remove Liquidity**
  - LP token balance display
  - Amount input (with percentage buttons: 25%, 50%, 75%, Max)
  - Preview of tokens to receive
  - Price impact warning
  - Remove liquidity button

- **My Liquidity Positions**
  - List of active LP positions
  - Each shows: Token pair, LP amount, USD value, Share %
  - Pool APR/APY
  - Unclaimed fees
  - Add/Remove buttons for each position

- **Available Pools**
  - List of all liquidity pools
  - Each shows: Token pair, TVL, Volume 24h, APR
  - Sort/filter options
  - Pool details modal

- **Liquidity History**
  - Add/Remove transactions
  - Fee claims
  - Filter by pool, date, type

### Components Needed
- `MobileLiquidityBox.js` - Main container
- `AddLiquidityCard.js` - Add liquidity interface
- `RemoveLiquidityCard.js` - Remove liquidity interface
- `LiquidityPositionsList.js` - User's LP positions
- `PoolList.js` - Available pools
- `LiquidityHistory.js` - Transaction history
- `PriceRatioDisplay.js` - Price ratio component
- `SlippageSettings.js` - Slippage tolerance input

### Design Consistency (iOS Style)
- iOS-style dual-token input (system input style, 44px height)
- iOS-style token selector (picker appearance)
- iOS-style cards with grouped list sections
- iOS-style buttons (system blue primary, custom green for actions)
- iOS-style transaction details (grouped list with separators)
- iOS-style modals for pool details
- Swipe actions on LP positions

### Integration Points
- `wagmi` for wallet and balances
- LP token contracts interaction
- Router contract for adding/removing liquidity
- Price calculation utilities
- Slippage protection logic

### API Endpoints Needed
- `GET /api/v1/liquidity/pools` - Get all pools
- `GET /api/v1/liquidity/user-positions` - Get user's LP positions
- `GET /api/v1/liquidity/pool-details/:poolId` - Pool details
- `GET /api/v1/liquidity/price-ratio` - Calculate price ratio
- `GET /api/v1/liquidity/history` - Liquidity transaction history
- `POST /api/v1/liquidity/add` - Add liquidity (if backend handles)
- `POST /api/v1/liquidity/remove` - Remove liquidity (if backend handles)

---

## 4. SETTINGS PAGE (`/settings`)

### Purpose
App settings, wallet management, preferences, and account information.

### Features
- **Wallet Settings**
  - Connected wallet address display
  - Disconnect wallet button
  - Switch wallet button
  - Wallet network display
  - Switch network option

- **App Preferences**
  - Theme toggle (if applicable)
  - Language selection
  - Currency preference (USD, EUR, etc.)
  - Slippage tolerance default
  - Transaction deadline default
  - Show/hide zero balances toggle

- **Notifications**
  - Enable/disable transaction notifications
  - Enable/disable price alerts
  - Email notification preferences

- **Security**
  - Transaction signing preferences
  - Auto-approve token spending (with warnings)
  - Clear transaction history
  - Export transaction history

- **About & Support**
  - App version
  - Terms of Service link
  - Privacy Policy link
  - Support/Contact link
  - Social media links
  - Documentation link

- **Referral & Rewards**
  - Referral code display
  - Copy referral link
  - Referral stats summary
  - Rewards summary

- **Chain Management**
  - Supported chains list
  - Add custom RPC (advanced)
  - Chain status indicators

### Components Needed
- `MobileSettingsBox.js` - Main container
- `SettingsSection.js` - Reusable section component
- `SettingsToggle.js` - Toggle switch component
- `SettingsInput.js` - Input field component
- `WalletSettings.js` - Wallet management
- `PreferencesSettings.js` - App preferences
- `SecuritySettings.js` - Security options
- `AboutSection.js` - About and links

### Design Consistency (iOS Style)
- iOS-style navigation bar
- iOS-style tab bar
- iOS-style grouped list sections (settings groups)
- iOS-style toggles (system switch style)
- iOS-style inputs (system text field style)
- iOS-style action sheets for settings actions
- iOS-style modals for confirmations
- iOS-style disclosure indicators for navigation

### Integration Points
- `wagmi` for wallet management
- `chainConfig` for chain information
- Local storage for preferences
- Referral system integration
- App version from package.json

### API Endpoints Needed
- `GET /api/v1/user/preferences` - Get user preferences
- `POST /api/v1/user/preferences` - Update preferences
- `GET /api/v1/user/referral-info` - Get referral info
- (Most settings stored locally, minimal API needed)

---

## Implementation Order

### Phase 1: Foundation & iOS Design System (Week 1)
1. Set up iOS design system (colors, typography, spacing)
2. Implement safe area handling and dark mode support
3. Create iOS-style base components (cards, buttons, inputs)
4. Create route structure in `App.js`
5. Create base components for each page
6. Implement MobileSettingsBox (simplest, no API dependencies)
7. Set up CSS structure for each page with iOS styling
8. Implement iOS animations and transitions

### Phase 2: Portfolio (Week 2)
1. Implement Portfolio overview
2. Asset list with balances
3. Chain breakdown
4. Basic transaction history

### Phase 3: Stake (Week 3)
1. Stake interface
2. Staking pools display
3. Active stakes management
4. Rewards system

### Phase 4: Liquidity (Week 4)
1. Add liquidity interface
2. Remove liquidity interface
3. LP positions display
4. Pool list and details

### Phase 5: Polish & Integration (Week 5)
1. Error handling across all pages
2. Loading states
3. Toast notifications
4. Testing and bug fixes
5. Mobile responsiveness
6. Integration testing

---

## File Structure

```
src/components/
├── MobileStakeBox.js
├── MobilePortfolioBox.js
├── MobileLiquidityBox.js
├── MobileSettingsBox.js
├── stake/
│   ├── MobileStakeCard.js
│   ├── StakePoolList.js
│   ├── ActiveStakesList.js
│   ├── StakeRewardsDisplay.js
│   └── StakeHistory.js
├── portfolio/
│   ├── PortfolioOverview.js
│   ├── AssetList.js
│   ├── ChainTabs.js
│   ├── PortfolioChart.js
│   ├── TransactionHistoryList.js
│   └── AssetCard.js
├── liquidity/
│   ├── AddLiquidityCard.js
│   ├── RemoveLiquidityCard.js
│   ├── LiquidityPositionsList.js
│   ├── PoolList.js
│   ├── LiquidityHistory.js
│   ├── PriceRatioDisplay.js
│   └── SlippageSettings.js
├── settings/
│   ├── SettingsSection.js
│   ├── SettingsToggle.js
│   ├── SettingsInput.js
│   ├── WalletSettings.js
│   ├── PreferencesSettings.js
│   ├── SecuritySettings.js
│   └── AboutSection.js
└── css/
    ├── StakeMobile.css
    ├── PortfolioMobile.css
    ├── LiquidityMobile.css
    └── SettingsMobile.css
```

---

## Design System Consistency - iPhone Style UI/UX

### iOS Design Philosophy
- **Clarity**: Clear, legible text and intuitive icons
- **Deference**: UI supports content, not competes with it
- **Depth**: Visual hierarchy through layers, motion, and depth
- **Native Feel**: Feels like a native iOS app, not a web app

### Color Palette Reference (Current Project Colors)
**IMPORTANT**: All new pages must use these exact colors from the Swap interface:

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background Gradient | Dark Radial | `radial-gradient(1200px 800px at 50% 0%, #2a2a2a 0%, #111111 45%, #0b0b0b 100%)` | Main page background |
| Card Background | White | `#FFFFFF` | All card containers |
| Primary Action Button | Neon Green | `#7cd85e` or `#3FF804` | Swap/Stake/Liquidity buttons |
| Button Glow | Green Glow | `0 0 18px rgba(63, 248, 4, 0.55)` | Button shadow effect |
| Wallet Icon | Blue | `#1E6BFF` | Wallet connection icon |
| Wallet Text | Light Gray | `#EDEDED` | Wallet address text |
| Active State | Cyan | `#00D4FF` | Active navigation indicator |
| Primary Text | Black | `#000000` | Text on white cards |
| Secondary Text | Light Gray | `#EDEDED` | Text on dark background |
| Muted Text | Gray | `#7A7A7A`, `#8A8A8A`, `#CFCFCF`, `#999999` | Secondary information |
| White Text | White | `#FFFFFF` | Text on dark backgrounds |
| Max Button | Black | `#000000` | Max button background |
| Swap Direction Button | Black | `#000000` | Swap direction circle |
| Divider Line | Light Gray | `#E9E9E9` | Card divider lines |
| Bottom Navigation | Black | `#000000` | Bottom nav background |
| BNB Token | Yellow/Gold | `#F3BA2F` | BNB token color |
| MANGO Token | Gold | `#FFD700` | MANGO token color |

### Colors (Current Project Colors)
- **Background**: 
  - Dark radial gradient: `radial-gradient(1200px 800px at 50% 0%, #2a2a2a 0%, #111111 45%, #0b0b0b 100%)`
  - Primary background: `#000000` (black)
  - Secondary background: `#FFFFFF` (white for cards)
- **Cards**: 
  - Card background: `#FFFFFF` (white)
  - Rounded corners: `32px` (current swap card style)
  - Shadow: `0 12px 24px rgba(0, 0, 0, 0.25)` (current swap card shadow)
- **Primary Actions**: 
  - Swap/Stake button: `#7cd85e` or `#3FF804` (neon green - current swap button)
  - Button glow: `0 0 18px rgba(63, 248, 4, 0.55)` (current glow effect)
  - Button text: `#000000` (black) with `opacity: 0.7`
- **Wallet & Accents**: 
  - Wallet icon: `#1E6BFF` (blue - current wallet icon)
  - Wallet text: `#EDEDED` (light gray - current wallet address text)
  - Active state: `#00D4FF` (cyan - from CSS variables, used for active nav)
- **Text Colors**:
  - Primary text: `#000000` (black - on white cards)
  - Secondary text: `#EDEDED` (light gray - on dark background)
  - Muted text: `#7A7A7A`, `#8A8A8A`, `#CFCFCF`, `#999999` (various grays)
  - White text: `#FFFFFF` (on dark backgrounds)
- **Buttons & Interactive Elements**:
  - Max button: `#000000` (black background) with `#FFFFFF` (white text)
  - Swap direction button: `#000000` (black circle)
  - Divider line: `#E9E9E9` (light gray)
  - Bottom navigation: `#000000` (black background)
- **Token Colors**:
  - BNB token: `#F3BA2F` (yellow/gold)
  - MANGO token: `#FFD700` (gold)
- **Status Colors** (from CSS variables):
  - Success: `#28A745`
  - Warning: `#FFC107`
  - Error: `#DC3545`
  - Accent primary: `#00D4FF` (cyan)
  - Accent secondary: `#F26E01` (orange)

### Typography (San Francisco Font Family)
- **Font Family**: 
  - Primary: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif`
  - Monospace: `'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace` (for addresses/numbers)
- **Headers**: 
  - Large Title: 34px, bold, tracking: 0.37px
  - Title 1: 28px, bold, tracking: 0.36px
  - Title 2: 22px, bold, tracking: 0.35px
  - Title 3: 20px, semibold, tracking: 0.38px
- **Body Text**:
  - Body: 17px, regular, tracking: -0.41px
  - Callout: 16px, regular, tracking: -0.32px
  - Subheadline: 15px, regular, tracking: -0.24px
  - Footnote: 13px, regular, tracking: -0.08px
  - Caption 1: 12px, regular, tracking: 0px
  - Caption 2: 11px, regular, tracking: 0.07px
- **Amounts/Values**: 
  - Large: 34px, bold, monospace font
  - Medium: 28px, semibold, monospace font
  - Small: 17px, regular, monospace font

### Spacing (iOS 8pt Grid System)
- **Base Unit**: 8px (all spacing multiples of 8)
- **Card Padding**: 16px (2 units) or 20px (2.5 units)
- **Section Gaps**: 16px (2 units) or 24px (3 units)
- **Element Gaps**: 8px (1 unit) or 12px (1.5 units)
- **Bottom Tab Bar**: 83px height (includes safe area)
- **Status Bar**: 44px height (includes safe area)
- **Navigation Bar**: 44px height
- **Safe Area**: Respect iPhone notch and home indicator

### iOS-Specific Components

#### Navigation
- **Navigation Bar**: 
  - Large title style (collapses on scroll)
  - Back button with chevron (system style)
  - Transparent/blurred background
  - Respects safe area insets
- **Tab Bar**:
  - 5 tabs maximum (iOS guideline)
  - Icon + label layout
  - Active state with system blue tint
  - Translucent background with blur
  - Respects home indicator safe area

#### Cards & Containers (Current Project Style)
- **Card Style**:
  - Background: `#FFFFFF` (white)
  - Rounded corners: `32px` (current swap card radius)
  - Shadow: `0 12px 24px rgba(0, 0, 0, 0.25)` (current swap card shadow)
  - Width: `604px` (max-width: 100% for responsive)
  - Padding: `24px` (current card padding)
  - Border: `none`
- **List Style**:
  - Grouped list style (rounded corners on first/last items)
  - Separator lines between items
  - Disclosure indicators (chevrons) for navigation
  - Swipe actions (iOS-style)

#### Buttons (Current Project Style)
- **Primary Action Button** (Swap/Stake/Liquidity):
  - Background: `#7cd85e` or `#3FF804` (neon green - current swap button)
  - Text: `#000000` (black) with `opacity: 0.7`
  - Height: `78px` (current swap button height)
  - Width: `604px` (max-width: 100% for responsive)
  - Rounded corners: `39px` (pill shape - current style)
  - Glow effect: `0 0 18px rgba(63, 248, 4, 0.55)` (current glow)
  - Font: `22px`, `font-weight: 700`
- **Secondary Button** (Max button style):
  - Background: `#000000` (black)
  - Text: `#FFFFFF` (white)
  - Height: `34px` (current Max button height)
  - Rounded corners: `9999px` (pill shape)
  - Padding: `0 14px`
  - Font: `14px`, `font-weight: 600`
- **Destructive Button**:
  - Background: `#DC3545` (red from CSS variables)
  - Text: `#FFFFFF` (white)
- **Action Button** (Swap/Stake/Liquidity):
  - Background: `#7cd85e` or `#3FF804` (neon green - current swap button)
  - Text: `#000000` (black) with `opacity: 0.7`
  - Height: `78px` (current swap button height)
  - Width: `604px` (max-width: 100% for responsive)
  - Rounded corners: `39px` (pill shape - current style)
  - Glow effect: `0 0 18px rgba(63, 248, 4, 0.55)` (current glow)
  - Font: `22px`, `font-weight: 700`

#### Inputs & Forms (Current Project Style)
- **Amount Input**:
  - Background: `transparent`
  - Text color: `#000000` (black)
  - Font size: `34px` (current amount display)
  - Font weight: `700` (bold)
  - Text align: `right`
  - Border: `none`
  - Line height: `1`
  - Letter spacing: `-0.5px`
- **USD Value Display**:
  - Text color: `#7A7A7A` (muted gray - current style)
  - Font size: `16px`
  - Font weight: `400`
  - Text align: `right`
  - Margin top: `8px`
- **Token Selector**:
  - Icon size: `48px` (current token icon size)
  - Symbol font: `20px`, `font-weight: 600` (current style)
  - Large touch targets (48px minimum)

#### Modals & Sheets
- **Action Sheets**:
  - Slide up from bottom
  - Rounded top corners: 20px
  - Cancel button at bottom
  - Options with separators
  - Dark overlay backdrop
- **Modals**:
  - Centered presentation
  - Rounded corners: 20px
  - Close button (X) in top-right
  - Respects safe area

#### Feedback & States
- **Loading States**:
  - System activity indicator (spinner)
  - Skeleton screens for content loading
  - Progress bars for long operations
- **Empty States**:
  - Large icon (SF Symbols style)
  - Title and description
  - Optional action button
- **Error States**:
  - System Red for errors
  - Clear error messages
  - Retry actions

### iOS Animations & Transitions
- **Page Transitions**:
  - Slide animations (push/pop)
  - Duration: 0.35s
  - Easing: `cubic-bezier(0.4, 0.0, 0.2, 1.0)` (iOS standard)
- **Button Presses**:
  - Scale down to 0.97 on press
  - Spring animation on release
  - Haptic feedback (if available)
- **Card Interactions**:
  - Subtle scale on tap
  - Smooth transitions
- **Scroll Animations**:
  - Momentum scrolling
  - Elastic bounce at edges
  - Parallax effects for headers

### iOS Gestures
- **Swipe Actions**:
  - Swipe left on list items for actions
  - Swipe right for navigation back
- **Pull to Refresh**:
  - Standard iOS pull-to-refresh
  - Spinner animation
- **Long Press**:
  - Context menus (iOS 13+)
  - Haptic feedback

### Safe Area & Layout
- **Safe Area Insets**:
  - Top: Status bar + notch (if present)
  - Bottom: Home indicator area (34px on iPhone X+)
  - Use CSS `env(safe-area-inset-*)` variables
- **Viewport**:
  - `viewport-fit=cover` for full-screen
  - Respect notch and home indicator
- **Status Bar**:
  - Light content on dark backgrounds
  - Dark content on light backgrounds
  - Auto-adjust based on theme

### Accessibility (iOS Standards)
- **Dynamic Type**: Support iOS text size preferences
- **VoiceOver**: Proper ARIA labels and roles
- **Color Contrast**: WCAG AA minimum (4.5:1)
- **Touch Targets**: Minimum 44x44px
- **Reduced Motion**: Respect `prefers-reduced-motion`

### Dark Mode Support
- **Automatic**: Use CSS variables that adapt
- **System Preference**: Follow `prefers-color-scheme`
- **Manual Toggle**: Optional in settings
- **Color Adaptation**: All colors adapt automatically

### Components (iOS-Style)
- All pages use `MobileSwapHeader` (iOS navigation bar style)
- All pages use `BottomNavigation` (iOS tab bar style)
- All pages use iOS-style cards with blur effects
- All pages use iOS-style buttons and inputs
- All pages use iOS-style modals and action sheets
- All pages use iOS-style token selector (picker style)
- All pages use iOS-style error/success alerts
- All pages respect safe area insets
- All pages support dark mode
- All pages use iOS animations and transitions

---

## Technical Requirements

### Dependencies (Already Available)
- `react-router-dom` - Routing
- `wagmi` - Wallet integration
- `viem` - Ethereum utilities
- `react-bootstrap` - UI components
- `axios` - API calls

### New Hooks Needed
- `useStake.js` - Staking operations
- `useLiquidity.js` - Liquidity operations
- `usePortfolio.js` - Portfolio data fetching
- `useSettings.js` - Settings management

### Utilities Needed
- `portfolioUtils.js` - Portfolio calculations
- `liquidityUtils.js` - Liquidity calculations
- `stakeUtils.js` - Staking calculations
- `settingsStorage.js` - Local storage for settings

---

## Testing Requirements

### Unit Tests
- Component rendering
- Hook functionality
- Utility functions
- Error handling

### Integration Tests
- Wallet connection flow
- Transaction flows
- API integration
- Navigation between pages

### E2E Tests
- Complete user flows
- Cross-page navigation
- Transaction execution
- Error scenarios

---

## iOS-Specific Implementation Notes

### 1. **iPhone-First Design**
- Design specifically for iPhone screen sizes (375px - 428px width)
- Test on iPhone SE, iPhone 12/13/14, iPhone Pro Max sizes
- Use iOS viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`

### 2. **iOS Components Library**
- Use iOS-style components throughout
- Implement SF Symbols-style icon system
- Use system fonts (San Francisco) for native feel
- Implement iOS-style blur effects with `backdrop-filter`

### 3. **Safe Area Handling**
```css
/* Example safe area usage */
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### 4. **Dark Mode Implementation**
```css
/* Use CSS variables that adapt */
:root {
  --bg-primary: #FFFFFF;
  --text-primary: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #000000;
    --text-primary: #FFFFFF;
  }
}
```

### 5. **iOS Animations**
- Use CSS transitions with iOS easing curves
- Implement spring animations for interactions
- Add haptic feedback where appropriate (if available via Web API)
- Respect `prefers-reduced-motion` for accessibility

### 6. **Touch Interactions**
- Minimum touch target: 44x44px (iOS HIG)
- Implement touch feedback (active states)
- Support swipe gestures for navigation
- Long press for context menus

### 7. **Performance**
- Optimize for 60fps animations
- Use `will-change` for animated elements
- Implement virtual scrolling for long lists
- Lazy load images and components

### 8. **Accessibility**
- Support Dynamic Type (iOS text size preferences)
- Proper ARIA labels for VoiceOver
- High contrast mode support
- Keyboard navigation support

### 9. **iOS-Specific Features**
- Add to Home Screen (PWA) support
- Splash screen configuration
- Status bar styling
- Share sheet integration (if applicable)

1. **Mobile-First**: All pages must be designed mobile-first, matching the Swap page design
2. **Consistency**: Reuse existing components and styles wherever possible
3. **Error Handling**: Use the same error handling patterns as Swap page
4. **Loading States**: Implement loading states for all async operations
5. **Responsive**: Ensure all pages work on various mobile screen sizes
6. **Accessibility**: Follow accessibility best practices
7. **Performance**: Optimize for fast load times and smooth interactions

---

## Success Criteria

- [ ] All four pages are accessible via bottom navigation
- [ ] All pages match the Swap page design style
- [ ] All pages integrate with wallet connection
- [ ] All pages handle errors gracefully
- [ ] All pages show loading states appropriately
- [ ] All pages are responsive on mobile devices
- [ ] All pages have proper routing
- [ ] All pages use consistent components and styling
- [ ] All pages integrate with existing services and utilities
- [ ] All pages are tested and bug-free

