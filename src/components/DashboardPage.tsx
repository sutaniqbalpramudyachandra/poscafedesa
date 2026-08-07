import { useState, useEffect, useCallback } from 'react';
import { supabase, type Transaction, type TransactionItem } from '@/lib/supabase';
import { formatRupiah, formatNumber } from '@/lib/format';
import { getTopSelling, getLeastSelling, aggregateDailyRevenue, type ProductSales, type DailyRevenue } from '@/lib/analytics';
import { HorizontalBarChart, LineChart } from './Charts';
import {
  TrendingUp,
  Receipt,
  Inbox,
  Trophy,
  TrendingDown,
  Loader2,
  CalendarDays,
  Award,
  AlertCircle,
  DollarSign,
  PieChart,
} from 'lucide-react';

type DashboardPageProps = {
  refreshKey: number;
};

type Period = '7d' | '30d' | 'all';

// Tipe ekstensi untuk item yang memuat harga beli dari produk
type TransactionItemWithProduct = TransactionItem & {
  products?: {
    buy_price?: number;
  };
  buy_price?: number; // Jika harga beli disimpan langsung di item
};

export function DashboardPage({ refreshKey }: DashboardPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<TransactionItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('7d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Ambil transaksi yang berstatus 'paid'
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (txError) {
      setError('Gagal memuat data dashboard.');
      setLoading(false);
      return;
    }

    const txList = (txData ?? []) as Transaction[];
    setTransactions(txList);

    if (txList.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // 2. Ambil detail item beserta harga beli (buy_price) dari relasi produk
    const txIds = txList.map((t) => t.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('transaction_items')
      .select(`
        *,
        products (
          buy_price
        )
      `)
      .in('transaction_id', txIds);

    if (itemsError) {
      setError('Gagal memuat detail item.');
      setLoading(false);
      return;
    }

    setItems((itemsData ?? []) as TransactionItemWithProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Filter transaksi & item berdasarkan periode terpilih
  const filteredTx = filterByPeriod(transactions, period);
  const filteredTxIds = new Set(filteredTx.map((t) => t.id));
  const filteredItems = items.filter((i) => filteredTxIds.has(i.transaction_id));

  // --- Perhitungan Keuangan ---
  const totalRevenue = filteredTx.reduce((s, t) => s + t.total, 0); // Total Omset
  const totalTransactions = filteredTx.length;
  const totalItemsSold = filteredItems.reduce((s, i) => s + i.qty, 0);
  const avgPerTransaction = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Hitung Total HPP (Modal) dari item terjual
  const totalCogs = filteredItems.reduce((s, item) => {
    // Ambil buy_price dari item atau relasi products
    const buyPrice = item.buy_price ?? item.products?.buy_price ?? 0;
    return s + item.qty * buyPrice;
  }, 0);

  // Hitung Keuntungan Bersih (Profit)
  const netProfit = totalRevenue - totalCogs;

  const topSelling: ProductSales[] = getTopSelling(filteredItems, 5);
  const leastSelling: ProductSales[] = getLeastSelling(filteredItems, 5);
  const dailyData: DailyRevenue[] = aggregateDailyRevenue(filteredTx);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-cafe-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-cafe-600 text-sm mb-3">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Dashboard & Analisis</h2>
          <p className="text-sm text-cafe-500">Pantau performa penjualan dan keuntungan cafe Anda</p>
        </div>
        <div className="flex gap-1.5 bg-white border border-cafe-200 rounded-xl p-1 shadow-sm">
          {([['7d', '7 Hari'], ['30d', '30 Hari'], ['all', 'Semua']] as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === key
                  ? 'bg-cafe-600 text-cream-50 shadow-sm'
                  : 'text-cafe-500 hover:bg-cafe-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredTx.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-cafe-300">
          <CalendarDays className="w-16 h-16 mb-4" />
          <p className="text-cafe-400 font-medium">Belum ada data pada periode ini</p>
          <p className="text-cafe-300 text-sm mt-1">Mulai jualan untuk melihat analisis di sini</p>
        </div>
      ) : (
        <>
          {/* STAT CARDS - TERMASUK KEUNTUNGAN BERSIH */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Keuntungan Bersih (Profit)"
              value={formatRupiah(netProfit)}
              color="bg-emerald-100 text-emerald-700"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Total Pemasukan (Omset)"
              value={formatRupiah(totalRevenue)}
              color="bg-green-100 text-green-700"
            />
            <StatCard
              icon={<PieChart className="w-5 h-5" />}
              label="Total Modal (HPP)"
              value={formatRupiah(totalCogs)}
              color="bg-red-100 text-red-700"
            />
            <StatCard
              icon={<Receipt className="w-5 h-5" />}
              label="Transaksi"
              value={formatNumber(totalTransactions)}
              color="bg-blue-100 text-blue-700"
            />
            <StatCard
              icon={<Inbox className="w-5 h-5" />}
              label="Item Terjual"
              value={formatNumber(totalItemsSold)}
              color="bg-amber-100 text-amber-700"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Rata-rata / Transaksi"
              value={formatRupiah(avgPerTransaction)}
              color="bg-cafe-100 text-cafe-700"
            />
          </div>

          {dailyData.length > 1 && (
            <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cafe-100 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-cafe-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-cafe-900">Tren Pemasukan Harian</h3>
                  <p className="text-xs text-cafe-400">Perkembangan pendapatan dari waktu ke waktu</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {(() => {
                  const revenues = dailyData.map((d) => d.revenue);
                  const sum = revenues.reduce((s, r) => s + r, 0);
                  const avg = Math.round(sum / revenues.length);
                  const highest = Math.max(...revenues);
                  const lowest = Math.min(...revenues);
                  const highestDay = dailyData.find((d) => d.revenue === highest);
                  return (
                    <>
                      <div className="bg-cafe-50 rounded-lg p-3">
                        <p className="text-[11px] text-cafe-400 font-medium">Total Pendapatan</p>
                        <p className="font-display font-bold text-cafe-800 text-sm mt-0.5">{formatRupiah(sum)}</p>
                      </div>
                      <div className="bg-cafe-50 rounded-lg p-3">
                        <p className="text-[11px] text-cafe-400 font-medium">Rata-rata Harian</p>
                        <p className="font-display font-bold text-cafe-800 text-sm mt-0.5">{formatRupiah(avg)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-[11px] text-green-500 font-medium">Tertinggi{highestDay ? ` (${highestDay.label})` : ''}</p>
                        <p className="font-display font-bold text-green-700 text-sm mt-0.5">{formatRupiah(highest)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-[11px] text-amber-500 font-medium">Terendah</p>
                        <p className="font-display font-bold text-amber-700 text-sm mt-0.5">{formatRupiah(lowest)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <LineChart
                data={dailyData.map((d) => ({ label: d.label, value: d.revenue }))}
                valueFormat={formatRupiah}
                emptyText="Belum ada data harian"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-cafe-900">Produk Paling Laku</h3>
                  <p className="text-xs text-cafe-400">Top 5 terlaris berdasarkan jumlah terjual</p>
                </div>
              </div>
              {topSelling.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-amber-50 to-cafe-50 rounded-xl border border-amber-200">
                    <Award className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="text-xs text-cafe-500">Juara #1</p>
                      <p className="font-display font-bold text-cafe-800">{topSelling[0].productName}</p>
                      <p className="text-xs text-cafe-500">{topSelling[0].totalQty} terjual · {formatRupiah(topSelling[0].totalRevenue)}</p>
                    </div>
                  </div>
                  <HorizontalBarChart
                    data={topSelling.map((p) => ({
                      label: p.productName,
                      value: p.totalQty,
                      sublabel: formatRupiah(p.totalRevenue),
                    }))}
                    color="#D97706"
                    valueFormat={(v) => `${v} terjual`}
                    emptyText="Belum ada penjualan"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center py-12 text-cafe-400 text-sm">
                  Belum ada penjualan
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-4.5 h-4.5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-cafe-900">Produk Kurang Laku</h3>
                  <p className="text-xs text-cafe-400">Perlu perhatian, mungkin perlu evaluasi</p>
                </div>
              </div>
              {leastSelling.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-red-50 to-cafe-50 rounded-xl border border-red-200">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-xs text-cafe-500">Paling sedikit terjual</p>
                      <p className="font-display font-bold text-cafe-800">{leastSelling[0].productName}</p>
                      <p className="text-xs text-cafe-500">{leastSelling[0].totalQty} terjual · {formatRupiah(leastSelling[0].totalRevenue)}</p>
                    </div>
                  </div>
                  <HorizontalBarChart
                    data={leastSelling.map((p) => ({
                      label: p.productName,
                      value: p.totalQty,
                      sublabel: formatRupiah(p.totalRevenue),
                    }))}
                    color="#EF4444"
                    valueFormat={(v) => `${v} terjual`}
                    emptyText="Belum ada penjualan"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center py-12 text-cafe-400 text-sm">
                  Belum ada penjualan
                </div>
              )}
            </div>
          </div>

          {topSelling.length > 0 && leastSelling.length > 0 && (
            <div className="mt-4 bg-cafe-800 text-cream-50 rounded-2xl p-5 shadow-sm">
              <h3 className="font-display font-bold text-base mb-2">Ringkasan Performa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-cafe-200">
                    <span className="font-semibold text-cream-50">{topSelling[0].productName}</span> adalah produk terlaris dengan {topSelling[0].totalQty} unit terjual.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-red-300 mt-0.5 flex-shrink-0" />
                  <p className="text-cafe-200">
                    <span className="font-semibold text-cream-50">{leastSelling[0].productName}</span> perlu perhatian, hanya terjual {leastSelling[0].totalQty} unit.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function filterByPeriod(transactions: Transaction[], period: Period): Transaction[] {
  if (period === 'all') return transactions;
  const days = period === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return transactions.filter((t) => new Date(t.created_at) >= cutoff);
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${color}`}>
        {icon}
      </div>
      <p className="text-[11px] text-cafe-400 font-medium mb-0.5">{label}</p>
      <p className="font-display font-bold text-sm sm:text-base text-cafe-800 truncate">{value}</p>
    </div>
  );
}