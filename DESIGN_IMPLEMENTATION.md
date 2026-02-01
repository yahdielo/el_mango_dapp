# Design Implementation Guide

This guide explains how to use the `design-spec.json` file to implement the mobile swap interface design.

## Overview

The design specification (`src/design-spec.json`) contains a complete JSON structure that defines all aspects of the mobile swap interface, matching the design shown in the provided images.

## File Structure

- `src/design-spec.json` - Complete design specification in JSON format
- `src/components/css/SwapMobile.css` - CSS implementation based on the spec
- This file - Implementation guide

## Design Specification Structure

The JSON specification is organized into the following sections:

### 1. Theme
- **Colors**: Background, text, accent, button, and token colors
- **Typography**: Font families, sizes, and weights
- **Spacing**: Consistent spacing scale
- **Border Radius**: Rounded corner values
- **Shadows**: Elevation system

### 2. Layout
- **Container**: Main container settings
- **Header**: Top navigation bar
- **Content**: Main content area
- **Footer**: Bottom navigation bar

### 3. Components
Detailed specifications for each UI component:
- **Header**: Wallet address display and menu
- **Swap Card**: "You Pay" and "You Receive" sections
- **Token Selector**: Token selection UI
- **Amount Display**: Amount and USD value display
- **Swap Button**: "Slide to Swap" button
- **Transaction Details**: Fee and rate information
- **Bottom Navigation**: 5-item navigation bar

### 4. Animations
- Slide to swap animation
- Token swap animation
- Button hover effects

### 5. Responsive Design
Breakpoints and adaptations for:
- Mobile (≤480px)
- Tablet (481-768px)
- Desktop (≥769px)

## Implementation Steps

### Step 1: Review the Design Spec

```javascript
import designSpec from './design-spec.json';

// Access theme colors
const primaryColor = designSpec.design.theme.colors.accent.primary; // #00D4FF

// Access component styles
const swapButtonStyle = designSpec.design.components.swapCard.swapButton.button;
```

### Step 2: Use CSS Variables

The `SwapMobile.css` file includes CSS variables that match the design spec:

```css
.mobile-swap-button {
  background-color: var(--accent-success);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
}
```

### Step 3: Component Structure

Create components following this structure:

```jsx
<div className="mobile-swap-container">
  {/* Header */}
  <div className="mobile-swap-header">
    <div className="mobile-swap-header-title">Swap</div>
    <div className="mobile-swap-wallet-address">
      <div className="mobile-swap-wallet-icon">C</div>
      <span className="mobile-swap-wallet-text">0xfK07...8336</span>
    </div>
  </div>

  {/* You Pay Card */}
  <div className="mobile-swap-card">
    <div className="mobile-swap-card-label">You Pay</div>
    <div className="mobile-swap-card-content">
      {/* Token selector and amount */}
    </div>
  </div>

  {/* Swap Direction */}
  <div className="mobile-swap-direction">
    <button className="mobile-swap-direction-button">
      {/* Swap arrows icon */}
    </button>
  </div>

  {/* You Receive Card */}
  <div className="mobile-swap-card">
    {/* Similar structure */}
  </div>

  {/* Swap Button */}
  <div className="mobile-swap-button-container">
    <button className="mobile-swap-button">
      <div className="mobile-swap-button-left-icon">→</div>
      <span className="mobile-swap-button-text">Slide to Swap</span>
      <div className="mobile-swap-button-right-icons">→→→</div>
      <div className="mobile-swap-button-slider"></div>
    </button>
  </div>

  {/* Bottom Navigation */}
  <div className="mobile-swap-bottom-nav">
    {/* Navigation items */}
  </div>
</div>
```

## Key Design Elements

### Color Scheme
- **Background**: Black (#000000)
- **Cards**: White (#FFFFFF)
- **Primary Accent**: Cyan (#00D4FF)
- **Success/Button**: Green (#28A745)
- **Token Colors**: 
  - BNB: Yellow (#F3BA2F)
  - MANGO: Gold (#FFD700)

### Typography
- **Primary Font**: System font stack
- **Monospace**: For addresses
- **Sizes**: 12px (small) to 24px (large)

### Spacing
- Uses consistent spacing scale (4px, 8px, 12px, 16px, etc.)
- Cards have 16px padding
- Elements have 12px gaps

### Border Radius
- Small elements: 8px
- Cards: 16px
- Buttons: 28px (pill shape)
- Icons: 50% (circular)

## Component Details

### Swap Button
The "Slide to Swap" button has:
- Green background (#28A745)
- Rounded pill shape (28px radius)
- Left icon (circular border)
- Right icons (three arrows)
- Slider animation on interaction

### Token Selector
- Circular icon (32px)
- Token symbol
- Dropdown arrow
- Light gray background (#F8F9FA)

### Amount Display
- Large amount (20px, bold)
- USD value below (14px, gray)
- Balance display above with "Max" button

### Bottom Navigation
Five items:
1. Stake (circle-dot icon)
2. Portfolio (diamonds icon)
3. Swap (swap-arrows icon) - Active
4. Liquidity (bar-chart icon)
5. Settings (gear icon)

## Responsive Behavior

### Mobile (Default)
- Full width container
- 16px padding
- Bottom navigation visible

### Tablet
- Max width 600px
- Centered
- 24px padding

### Desktop
- Max width 500px
- Centered
- 32px padding
- Bottom navigation hidden

## Animation Details

### Slide to Swap
- Slider width animates from 0% to 100%
- Duration: 0.3s
- Easing: ease-in-out

### Button Hover
- Slight lift (translateY -2px)
- Increased shadow
- Duration: 0.2s

## Accessibility

- Minimum contrast ratio: 4.5:1
- Touch targets: Minimum 44px
- Font sizes: Minimum 14px
- Semantic HTML structure

## Next Steps

1. **Update swapBox.js**: Refactor to use new component structure
2. **Create TokenSelector Component**: Reusable token selection UI
3. **Implement Slide Animation**: Add JavaScript for slide-to-swap interaction
4. **Add Bottom Navigation**: Create navigation component
5. **Integrate with Existing Logic**: Connect to current swap functionality
6. **Test Responsive Design**: Verify on different screen sizes
7. **Add Animations**: Implement smooth transitions

## Example Usage

```jsx
import './components/css/SwapMobile.css';
import designSpec from './design-spec.json';

function SwapBox() {
  const theme = designSpec.design.theme;
  
  return (
    <div 
      className="mobile-swap-container"
      style={{ backgroundColor: theme.colors.background.primary }}
    >
      {/* Your components here */}
    </div>
  );
}
```

## Notes

- The design spec is a living document - update it as the design evolves
- CSS variables make it easy to adjust colors globally
- Component classes follow BEM-like naming convention
- All measurements match the design spec exactly
- Icons should be replaced with actual SVG/icon components

