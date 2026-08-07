import { useState, useEffect, useCallback } from 'react';
import { getQueueCount } from '@/lib/db';
import { syncQueue } from '@/lib/sync';

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

type SyncState = 'idle' | 'syncing' | 'error' | 'partial';

type SyncStatus = {
  pendingCount: number;
  syncState: SyncState;
  lastSyncedAt: number | null;
  triggerSync: () => Promise<void>;
};

export function useSyncStatus(): SyncStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const online = useOnlineStatus();

  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
      if (count === 0 && syncState !== 'error') setSyncState('idle');
    } catch {
      // ignore
    }
  }, [syncState]);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncState('syncing');
    try {
      const result = await syncQueue();
      if (result.failed > 0 && result.synced > 0) {
        setSyncState('partial');
      } else if (result.failed > 0) {
        setSyncState('error');
      } else {
        setSyncState('idle');
        setLastSyncedAt(Date.now());
      }
      await refreshCount();
    } catch {
      setSyncState('error');
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (online) {
      triggerSync();
    }
  }, [online, triggerSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && pendingCount > 0) {
        triggerSync();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [pendingCount, triggerSync]);

  return { pendingCount, syncState, lastSyncedAt, triggerSync };
}
