# Monitoring Configuration Guide

This document outlines the monitoring setup for the Mango DeFi frontend in production.

## Overview

Monitoring is essential for:
- Detecting errors and issues early
- Tracking performance metrics
- Understanding user behavior
- Ensuring system reliability

## Error Logging

### Recommended Services

1. **Sentry** (Recommended)
   - Real-time error tracking
   - Source map support
   - User context
   - Performance monitoring

2. **LogRocket**
   - Session replay
   - Error tracking
   - Network monitoring

3. **Rollbar**
   - Error tracking
   - Real-time alerts
   - Deployment tracking

### Implementation

#### Sentry Setup

```javascript
// src/index.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### Error Boundaries

```javascript
// src/components/ErrorBoundary.js
import * as Sentry from "@sentry/react";

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
  
  render() {
    // Error UI
  }
}
```

### Error Types to Monitor

- JavaScript errors
- Network errors
- Transaction failures
- RPC failures
- API failures
- Wallet connection errors

## Analytics

### Recommended Services

1. **Google Analytics 4**
   - User behavior tracking
   - Event tracking
   - Custom dimensions

2. **Mixpanel**
   - Event tracking
   - User segmentation
   - Funnel analysis

3. **Amplitude**
   - User analytics
   - Event tracking
   - Retention analysis

### Implementation

#### Google Analytics Setup

```javascript
// src/utils/analytics.js
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID);

export const trackEvent = (category, action, label, value) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

export const trackChainEvent = (chainId, eventType, details) => {
  trackEvent('Chain', eventType, chainId, details);
};
```

### Events to Track

- Wallet connections (per chain)
- Chain switches
- Swap initiations (per chain)
- Swap completions (per chain)
- Transaction failures (per chain)
- Error occurrences (per chain)
- Feature usage (per chain)

## Performance Monitoring

### Recommended Services

1. **New Relic**
   - Real User Monitoring (RUM)
   - Performance metrics
   - Error tracking

2. **Datadog**
   - RUM
   - Performance monitoring
   - Error tracking

3. **Google Lighthouse CI**
   - Performance scores
   - Core Web Vitals
   - Automated testing

### Metrics to Monitor

- Page load time
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- API response times
- RPC response times
- Transaction confirmation times

### Implementation

```javascript
// src/utils/performance.js
export const measurePerformance = () => {
  if ('PerformanceObserver' in window) {
    // Measure Core Web Vitals
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Send to analytics
        trackEvent('Performance', entry.name, entry.value);
      }
    }).observe({ entryTypes: ['navigation', 'resource', 'paint'] });
  }
};
```

## Alerts

### Alert Types

1. **Error Rate Alerts**
   - Threshold: > 5% error rate
   - Action: Notify team immediately

2. **RPC Failure Alerts**
   - Threshold: > 50% RPC failures
   - Action: Check RPC endpoints

3. **API Failure Alerts**
   - Threshold: > 10% API failures
   - Action: Check API status

4. **Performance Alerts**
   - Threshold: Page load > 5s
   - Action: Investigate performance

### Alert Channels

- Email
- Slack
- PagerDuty (for critical alerts)
- SMS (for critical alerts)

## Dashboard

### Recommended Dashboard Tools

1. **Grafana**
   - Custom dashboards
   - Multiple data sources
   - Real-time updates

2. **Datadog Dashboard**
   - Pre-built widgets
   - Custom metrics
   - Real-time monitoring

3. **Custom Dashboard**
   - React-based
   - Real-time updates
   - Chain-specific metrics

### Dashboard Metrics

#### Overall Metrics
- Total users
- Active users
- Error rate
- Success rate
- Average response time

#### Per-Chain Metrics
- Transactions per chain
- Success rate per chain
- Error rate per chain
- Average confirmation time per chain
- RPC health per chain

#### Feature Metrics
- Swap volume
- Referral usage
- Whitelist usage
- LayerSwap usage

## Log Aggregation

### Recommended Services

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - Centralized logging
   - Search and analysis
   - Visualization

2. **CloudWatch** (AWS)
   - Log aggregation
   - Monitoring
   - Alerts

3. **Datadog Logs**
   - Centralized logging
   - Search
   - Correlation with metrics

### Log Levels

- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Warnings that may indicate issues
- **INFO**: General information about application flow
- **DEBUG**: Detailed debugging information (development only)

## Chain-Specific Monitoring

### Per-Chain Metrics

Track separately for each chain:
- Transaction success rate
- Average confirmation time
- Error rate
- RPC health
- User activity

### Chain Health Dashboard

Display:
- Chain status (active/maintenance/offline)
- Recent transactions
- Error rates
- RPC health
- User activity

## Implementation Checklist

- [ ] Error logging service configured
- [ ] Error boundaries implemented
- [ ] Analytics service configured
- [ ] Event tracking implemented
- [ ] Performance monitoring configured
- [ ] Alerts configured
- [ ] Dashboard created
- [ ] Log aggregation set up
- [ ] Chain-specific monitoring configured
- [ ] Team access granted
- [ ] Documentation updated

## Best Practices

1. **Don't Log Sensitive Data**
   - Never log API keys
   - Never log private keys
   - Never log user addresses (hash them)

2. **Rate Limiting**
   - Limit error logging rate
   - Batch events when possible
   - Use sampling for high-volume events

3. **Privacy**
   - Anonymize user data
   - Comply with GDPR
   - Get user consent for analytics

4. **Performance**
   - Don't block UI with logging
   - Use async logging
   - Batch network requests

## Example Configuration

```javascript
// src/config/monitoring.js
export const monitoringConfig = {
  sentry: {
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
  },
  analytics: {
    gaId: process.env.REACT_APP_GA_MEASUREMENT_ID,
    enabled: process.env.NODE_ENV === 'production',
  },
  performance: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1, // 10% of transactions
  },
};
```

---

**Last Updated**: Keep monitoring configuration updated as requirements change.

