import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useEvents(repoId = '', status = '', page = 1, limit = 20, pollIntervalMs = 6000) {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (repoId) params.append('repo_id', repoId);
      if (status) params.append('status', status);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const data = await api.get(`/api/events?${params.toString()}`);
      setEvents(data.events || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [repoId, status, page, limit]);

  useEffect(() => {
    setLoading(true);
    fetchEvents(false);

    if (pollIntervalMs > 0) {
      const timer = setInterval(() => fetchEvents(true), pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchEvents, pollIntervalMs]);

  return { events, pagination, loading, isRefreshing, refetch: () => fetchEvents(false) };
}
