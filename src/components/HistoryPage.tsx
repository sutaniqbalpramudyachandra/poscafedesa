import { useState, useEffect, useCallback } from 'react';
import { supabase, type TransactionWithItems, type TransactionItem, type AppSettings } from '@/lib/supabase';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { generateReceiptDataURL, downloadReceiptImage } from '@/lib/receipt';
import { fetchSettings, getDefaultSettings } from '@/lib/settings';
import { getUnsyncedLocalTransactions } from '@/lib/db';
import { Receipt, Search, FileSpreadsheet, FileDown, ChevronDown, ChevronRight, Download, X, Banknote, QrCode, Loader as Loader2, Calendar, TrendingUp, Inbox, Eye, CloudOff } from 'lucide-react';

type HistoryPageProps = {
  refreshKey: number;
};

export function HistoryPage({ refreshKey }: HistoryPageProps) {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [receiptTx, setReceiptTx] = useState<TransactionWithItems | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Always merge in unsynced local transactions (offline queue)
    const localTxList = await getUnsyncedLocalTransactions().catch(() => []);
    const localAsFull: TransactionWithItems[] = localTxList.map((ltx) => ({
      id: ltx.localId,
      invoice_no: ltx.invoice_no,
      payment_method: ltx.payment_method as 'Tunai' | 'QRIS',
      subtotal: ltx.subtotal,
      total: ltx.total,
      amount_paid: ltx.amount_paid,
      change: ltx.change,
      status: ltx.status as 'paid' | 'unpaid' | 'cancelled',
      table_number: ltx.table_number,
      created_at: ltx.created_at,
      items: ltx.items.map((it, idx) => ({
        id: `${ltx.localId}-${idx}`,
        transaction_id: ltx.localId,
        product_id: it.product_id,
        product_name: it.product_name,
        qty: it.qty,
        price: it.price,
        cost_price: it.cost_price,
        subtotal: it.subtotal,
      })),
    }));

    if (!navigator.onLine) {
      setTransactions(localAsFull.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (localAsFull.length > 0) {
        setTransactions(localAsFull);
      } else {
        setError('Gagal memuat riwayat transaksi.');
      }
      setLoading(false);
      return;
    }

    const txIds = (data ?? []).map((t) => t.id);
    let itemsByTx = new Map<string, TransactionItem[]>();

    if (txIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .in('transaction_id', txIds);

      if (itemsError) {
        setError('Gagal memuat detail item transaksi.');
        setLoading(false);
        return;
      }

      itemsByTx = new Map<string, TransactionItem[]>();
      for (const item of itemsData as TransactionItem[]) {
        const arr = itemsByTx.get(item.transaction_id) ?? [];
        arr.push(item);
        itemsByTx.set(item.transaction_id, arr);
      }
    }

    const full: TransactionWithItems[] = (data ?? []).map((t) => ({
      ...(t as TransactionWithItems),
      items: itemsByTx.get(t.id) ?? [],
    }));

    // Merge: only include local transactions that aren't already in the server list
    const serverIds = new Set(full.map((t) => t.id));
    const merged = [...full, ...localAsFull.filter((t) => !serverIds.has(t.id))];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setTransactions(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      t.items.some((i) => i.product_name.toLowerCase().includes(search.toLowerCase()));
    const matchDate = !filterDate || t.created_at.slice(0, 10) === filterDate;
    return matchSearch && matchDate;
  });

  const totalRevenue = filtered.reduce((s, t) => s + t.total, 0);
  const totalTransactions = filtered.length;
  const totalItems = filtered.reduce((s, t) => s + t.items.reduce((q, i) => q + i.qty, 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Riwayat Penjualan</h2>
          <p className="text-sm text-cafe-500">Semua transaksi yang sudah dibayar tercatat di sini</p>
          {transactions.some((t) => t.id.startsWith('local-')) && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1.5">
              <CloudOff className="w-3.5 h-3.5" />
              {transactions.filter((t) => t.id.startsWith('local-')).length} transaksi belum tersinkronisasi
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-green-700 transition-colors disabled:opacity-40 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => exportToCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-cafe-700 text-cream-50 rounded-xl font-semibold text-sm shadow-sm hover:bg-cafe-800 transition-colors disabled:opacity-40 active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Pemasukan"
          value={formatRupiah(totalRevenue)}
        />
        <StatCard
          icon={<Receipt className="w-5 h-5" />}
          label="Transaksi"
          value={String(totalTransactions)}
        />
        <StatCard
          icon={<Inbox className="w-5 h-5" />}
          label="Item Terjual"
          value={String(totalItems)}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. invoice atau nama item..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400 pointer-events-none" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full sm:w-auto pl-11 pr-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all shadow-sm"
          />
        </div>
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className="px-4 py-3 bg-cafe-100 text-cafe-600 rounded-xl text-sm font-semibold hover:bg-cafe-200 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-cafe-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-cafe-600 text-sm mb-3">{error}</p>
          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
          >
            Coba lagi
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-cafe-300">
          <Receipt className="w-16 h-16 mb-4" />
          <p className="text-cafe-400 font-medium">
            {transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ada hasil filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((tx) => {
            const expanded = expandedId === tx.id;
            return (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-cafe-100 overflow-hidden transition-shadow hover:shadow-md animate-fade-in"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : tx.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-cafe-100 flex items-center justify-center flex-shrink-0">
                    {tx.payment_method === 'Tunai' ? (
                      <Banknote className="w-5 h-5 text-cafe-600" />
                    ) : (
                      <QrCode className="w-5 h-5 text-cafe-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-cafe-900 truncate">{tx.invoice_no}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.payment_method === 'Tunai' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.payment_method}
                      </span>
                      {tx.id.startsWith('local-') && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <CloudOff className="w-3 h-3" />
                          Belum Sync
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cafe-400 mt-0.5">{formatDateTime(tx.created_at)}</p>
                    <p className="text-xs text-cafe-500 mt-0.5">
                      {tx.items.reduce((s, i) => s + i.qty, 0)} item · {tx.items.length} produk
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-base text-cafe-800">
                      {formatRupiah(tx.total)}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronDown className="w-5 h-5 text-cafe-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-cafe-400 flex-shrink-0" />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-cafe-100 p-4 bg-cafe-50/50 animate-slide-up">
                    <div className="space-y-1.5 mb-3">
                      {tx.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="bg-cafe-200 text-cafe-700 text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                              {item.qty}
                            </span>
                            <span className="text-cafe-800 truncate">{item.product_name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-cafe-400 text-xs">{formatRupiah(item.price)}</span>
                            <span className="font-semibold text-cafe-800 tabular-nums">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-cafe-200">
                      <div className="text-sm space-y-0.5">
                        <p className="text-cafe-500">Subtotal: <span className="font-semibold text-cafe-700">{formatRupiah(tx.subtotal)}</span></p>
                        {tx.change > 0 && (
                          <p className="text-cafe-500">Kembalian: <span className="font-semibold text-cafe-700">{formatRupiah(tx.change)}</span></p>
                        )}
                      </div>
                      <button
                        onClick={() => setReceiptTx(tx)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cafe-600 text-cream-50 rounded-xl font-semibold text-sm hover:bg-cafe-700 transition-colors active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Struk
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {receiptTx && (
        <ReceiptImageModal
          transaction={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
        />
      )}
    </div>
  );
}

function ReceiptImageModal({
  transaction,
  settings,
  onClose,
}: {
  transaction: TransactionWithItems;
  settings: AppSettings;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    generateReceiptDataURL(transaction, settings).then((url) => {
      if (mounted) {
        setDataUrl(url);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [transaction, settings]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[94vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-cafe-100 bg-white">
          <h3 className="font-display font-bold text-lg text-cafe-900">Struk Pembayaran</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cafe-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 flex justify-center">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-cafe-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt={`Struk ${transaction.invoice_no}`}
              className="w-full max-w-[340px] rounded-lg shadow-md border border-cafe-100"
            />
          ) : (
            <p className="text-sm text-cafe-400 text-center py-16">Gagal membuat struk.</p>
          )}
        </div>

        <div className="p-4 border-t border-cafe-100 bg-white">
          <button
            onClick={() => downloadReceiptImage(dataUrl, transaction.invoice_no)}
            disabled={loading || !dataUrl}
            className="w-full py-3.5 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Simpan Gambar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
      <div className="w-9 h-9 rounded-lg bg-cafe-100 text-cafe-600 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-[11px] text-cafe-400 font-medium mb-0.5">{label}</p>
      <p className="font-display font-bold text-sm text-cafe-800 truncate">{value}</p>
    </div>
  );
}
