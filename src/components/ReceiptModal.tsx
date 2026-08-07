// src/components/ReceiptModal.tsx
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, CheckCircle2, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any; // Data transaksi
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const handleDownloadJPG = async () => {
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2, // Resolusi tinggi
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const image = canvas.toDataURL('image/jpeg', 1.0);
    const link = document.createElement('a');
    link.href = image;
    link.download = `Nota-${transaction.id || Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
            <CheckCircle2 size={24} />
            <span>Pembayaran Berhasil</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Kontainer Struk untuk Diunduh (Area Layout Aman) */}
        <div className="overflow-y-auto flex-1 p-2">
          <div 
            ref={receiptRef} 
            className="bg-white p-8 border border-slate-200 rounded-lg text-slate-800 text-sm w-full mx-auto"
            style={{ width: '340px' }} // Lebar standar nota thermal
          >
            {/* Header Toko */}
            <div className="text-center mb-4 break-words whitespace-normal">
              <h2 className="text-xl font-bold uppercase tracking-wide">CAFE DESA</h2>
              <p className="text-xs text-slate-500 mt-1">Jl. Raya Desa No. 123, Kabupaten Kasir</p>
              <p className="text-xs text-slate-500">Telp/WA: 0812-3456-7890</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2 my-2 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-mono">{transaction.id?.slice(0, 8) || 'OFFLINE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{new Date().toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashier_name || 'Kasir'}</span>
              </div>
            </div>

            {/* Rincian Produk */}
            <div className="space-y-2 my-3">
              {transaction.items?.map((item: any, idx: number) => (
                <div key={idx} className="text-xs">
                  <div className="font-semibold break-words">{item.name}</div>
                  <div className="flex justify-between text-slate-600 mt-0.5">
                    <span>{item.qty} x Rp {item.price?.toLocaleString('id-ID')}</span>
                    <span className="font-medium text-slate-800">
                      Rp {(item.qty * item.price)?.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Pembayaran */}
            <div className="border-t border-dashed border-slate-300 pt-3 mt-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>Rp {transaction.total?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bayar ({transaction.payment_method}):</span>
                <span>Rp {transaction.pay_amount?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kembali:</span>
                <span>Rp {transaction.change?.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Footer / Ucapan */}
            <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-dashed border-slate-300 break-words whitespace-normal">
              <p className="font-medium text-slate-700">~ Terima Kasih Atas Kunjungannya ~</p>
              <p className="mt-1 text-[10px]">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi (Hanya Unduh JPG) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleDownloadJPG}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Download size={18} />
            <span>Unduh Nota (JPG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};