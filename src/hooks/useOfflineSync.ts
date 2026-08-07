import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  getPendingQueue,
  updateQueueItem,
  removeQueueItem,
  markLocalTransactionSynced,
  type QueueItem,
} from '../lib/db';

export function useOfflineSync(onSyncComplete?: () => void) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 1. Pantau status koneksi internet secara real-time
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Fungsi untuk mengirimkan antrean transaksi ke Supabase
  const syncPendingTransactions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    // Ambil antrean transaksi yang berstatus 'pending' atau 'failed'
    const pendingList = await getPendingQueue();
    if (pendingList.length === 0) return;

    setIsSyncing(true);

    for (const queueItem of pendingList) {
      if (!queueItem.id) continue;

      try {
        // Tandai status di antrean lokal menjadi 'syncing'
        await updateQueueItem(queueItem.id, {
          status: 'syncing',
          attempts: queueItem.attempts + 1,
        });

        const txPayload = queueItem.payload;

        // A. Insert ke tabel transactions Supabase
        const { data: newTx, error: txError } = await supabase
          .from('transactions')
          .insert({
            invoice_no: txPayload.invoice_no,
            payment_method: txPayload.payment_method,
            subtotal: txPayload.subtotal,
            total: txPayload.total,
            amount_paid: txPayload.amount_paid,
            change: txPayload.change,
            status: txPayload.status,
            table_number: txPayload.table_number,
            created_at: txPayload.created_at,
          })
          .select()
          .single();

        if (txError) throw txError;

        // B. Insert item transaksi ke tabel transaction_items Supabase
        const itemsToInsert = txPayload.items.map((item) => ({
          transaction_id: newTx.id,
          product_id: item.product_id,
          product_name: item.product_name,
          qty: item.qty,
          price: item.price,
          cost_price: item.cost_price || 0,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // C. Potong stok produk di Supabase
        for (const item of txPayload.items) {
          if (item.product_id) {
            await supabase.rpc('decrement_stock', {
              p_id: item.product_id,
              p_qty: item.qty,
            });
          }
        }

        // D. Jika berhasil, tandai transaksi lokal sudah di-sync & hapus dari antrean
        await markLocalTransactionSynced(txPayload.localId);
        await removeQueueItem(queueItem.id);
      } catch (err: any) {
        console.error('Gagal sinkronisasi transaksi:', queueItem.payload.invoice_no, err);
        // Tandai status antrean gagal agar bisa dicoba lagi nanti
        await updateQueueItem(queueItem.id, {
          status: 'failed',
          lastError: err?.message || 'Gagal sinkronisasi jaringan',
        });
        break; // Hentikan iterasi jika koneksi terputus di pertengahan
      }
    }

    setIsSyncing(false);
    if (onSyncComplete) onSyncComplete();
  }, [isSyncing, onSyncComplete]);

  // 3. Otomatis jalankan sinkronisasi begitu internet kembali tersambung (Online)
  useEffect(() => {
    if (isOnline) {
      syncPendingTransactions();
    }
  }, [isOnline, syncPendingTransactions]);

  return { isOnline, isSyncing, syncPendingTransactions };
}