// src/pages/ReportsPage.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

export const ReportsPage: React.FC<{ transactions: any[] }> = ({ transactions = [] }) => {
  const [filterRange, setFilterRange] = useState<'today' | '7days' | '30days'>('today');

  // Filter Transaksi berdasarkan Rentang Waktu
  const filteredData = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.created_at || Date.now());
      if (filterRange === 'today') {
        return txDate.toDateString() === now.toDateString();
      }
      const diffTime = Math.abs(now.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return filterRange === '7days' ? diffDays <= 7 : diffDays <= 30;
    });
  }, [transactions, filterRange]);

  // Kalkulasi Statistik
  const stats = useMemo(() => {
    let omzet = 0;
    let totalHPP = 0;
    let totalItems = 0;

    filteredData.forEach((tx) => {
      omzet += tx.total || 0;
      tx.items?.forEach((item: any) => {
        totalHPP += (item.cost_price || 0) * item.qty;
        totalItems += item.qty;
      });
    });

    const labaBersih = omzet - totalHPP;
    return { omzet, labaBersih, totalTransaksi: filteredData.length, totalItems };
  }, [filteredData]);

  // Fungsi Ekspor ke Excel (.xlsx)
  const handleExportExcel = () => {
    const excelData: any[] = [];

    filteredData.forEach((tx) => {
      tx.items?.forEach((item: any) => {
        const omzetItem = item.qty * item.price;
        const hppItem = item.qty * (item.cost_price || 0);
        excelData.push({
          'Tanggal': new Date(tx.created_at).toLocaleString('id-ID'),
          'No. Transaksi': tx.id,
          'Nama Produk': item.name,
          'Qty': item.qty,
          'Harga Modal (HPP)': item.cost_price || 0,
          'Harga Jual': item.price,
          'Total Omzet': omzetItem,
          'Laba Bersih': omzetItem - hppItem,
          'Metode Bayar': tx.payment_method
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keuangan');
    XLSX.writeFile(workbook, `Laporan-POS-${filterRange}-${Date.now()}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar / Filter */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h1>
          <p className="text-slate-500 text-sm">Analisis penjualan dan laba bersih cafe Anda</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            {(['today', '7days', '30days'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setFilterRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterRange === range ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                {range === 'today' ? 'Hari Ini' : range === '7days' ? '7 Hari' : '30 Hari'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <Download size={16} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Total Omzet</p>
            <h3 className="text-xl font-bold text-slate-800">
              Rp {stats.omzet.toLocaleString('id-ID')}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Laba Bersih</p>
            <h3 className="text-xl font-bold text-emerald-600">
              Rp {stats.labaBersih.toLocaleString('id-ID')}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Total Transaksi</p>
            <h3 className="text-xl font-bold text-slate-800">
              {stats.totalTransaksi} <span className="text-xs font-normal text-slate-400">({stats.totalItems} item)</span>
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};