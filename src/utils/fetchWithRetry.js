/**
 * fetchWithRetry — wraps fetch() with automatic retry on transient network errors.
 *
 * Retries on:
 *   - TypeError: Failed to fetch  (ERR_NETWORK_CHANGED, ERR_CONNECTION_RESET, offline)
 *   - TypeError: NetworkError
 *   - 5xx server responses (optional, configurable)
 *
 * Does NOT retry on 4xx client errors (including 451 geo-block, 401 auth, 400 bad request).
 *
 * @param {string|URL} url
 * @param {RequestInit} [options]
 * @param {{ retries?: number, baseDelayMs?: number, retry5xx?: boolean }} [retryOptions]
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = 3,
    baseDelayMs = 1000,
    retry5xx = false,
  } = retryOptions;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Retry on 5xx if configured, but never on 4xx
      if (retry5xx && res.status >= 500 && attempt < retries) {
        lastError = new Error(`Server error: ${res.status}`);
        await delay(baseDelayMs * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;

      const isNetworkError =
        err instanceof TypeError &&
        (err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('network') ||
          err.message.includes('Load failed'));   // Safari

      if (!isNetworkError || attempt >= retries) {
        throw err;
      }

      // Wait for the browser to signal it's back online (up to 8s), then retry
      await Promise.race([
        waitForOnline(),
        delay(baseDelayMs * Math.pow(2, attempt)), // 1s, 2s, 4s
      ]);
    }
  }

  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves immediately if online, or waits for the `online` event (max 8s). */
function waitForOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener('online', done); resolve(); };
    window.addEventListener('online', done);
    setTimeout(done, 8000);
  });
}
