import { useState, useEffect, useCallback } from 'react';
import {
  getReferralTree,
  getReferralPerformance,
  getReferralInsights,
  getTopReferrers,
} from '../services/referralAnalyticsApi';

export function useReferralTree(address) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchTree = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const tree = await getReferralTree(address, 5);
      setData(tree);
    } catch (err) {
      setError(err?.message || 'Failed to load tree');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [address]);
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);
  return { data, loading, error, refetch: fetchTree };
}

export function useReferralPerformance(address) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchPerf = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const metrics = await getReferralPerformance(address);
      setData(metrics);
    } catch (err) {
      setError(err?.message || 'Failed to load performance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [address]);
  useEffect(() => {
    fetchPerf();
  }, [fetchPerf]);
  return { data, loading, error, refetch: fetchPerf };
}

export function useReferralInsights(address) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getReferralInsights(address || undefined);
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load insights');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [address]);
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);
  return { data, loading, error, refetch: fetchInsights };
}

export function useTopReferrers(limit = 10) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchTop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getTopReferrers(limit);
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load top referrers');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);
  useEffect(() => {
    fetchTop();
  }, [fetchTop]);
  return { data, loading, error, refetch: fetchTop };
}
