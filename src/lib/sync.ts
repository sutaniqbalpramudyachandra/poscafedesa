import { supabase } from '@/lib/supabase';
import {
  getPendingQueue,
  updateQueueItem,
  removeQueueItem,
  markLocalTransactionSynced,
  type QueueItem,
  type LocalTransaction,
} from '@/lib/db';

export type SyncResult = {
  synced: number;
  failed: number;
};

export async function syncQueue(): Promise<SyncResult> {
  const queue = await getPendingQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (!item.id) continue;
    await updateQueueItem(item.id, { status: 'syncing' });
    try {
      await syncTransaction(item.payload);
      await markLocalTransactionSynced(item.payload.localId);
      await removeQueueItem(item.id);
      synced++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await updateQueueItem(item.id, {
        status: 'failed',
        attempts: item.attempts + 1,
        lastError: errorMsg,
      });
      failed++;
    }
  }

  return { synced, failed };
}

async function syncTransaction(localTx: LocalTransaction): Promise<void> {
  const insertData = {
    invoice_no: localTx.invoice_no,
    payment_method: localTx.payment_method,
    subtotal: localTx.subtotal,
    total: localTx.total,
    amount_paid: localTx.amount_paid,
    change: localTx.change,
    status: localTx.status,
    table_number: localTx.table_number,
    created_at: localTx.created_at,
  };

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert(insertData)
    .select()
    .single();

  if (txError || !txData) {
    throw new Error(txError?.message || 'Failed to insert transaction');
  }

  const itemsToInsert = localTx.items.map((item) => ({
    transaction_id: txData.id,
    product_id: item.product_id,
    product_name: item.product_name,
    qty: item.qty,
    price: item.price,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('transactions').delete().eq('id', txData.id);
    throw new Error(itemsError.message);
  }

  for (const item of localTx.items) {
    if (!item.product_id) continue;
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();
    if (product && product.stock !== -1) {
      const newStock = Math.max(0, product.stock - item.qty);
      await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
    }
  }
}
