import type { TransactionWithItems } from './supabase';
import { formatDateTime } from './format';

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(transactions: TransactionWithItems[]): void {
  const headers = [
    'No. Invoice',
    'Tanggal & Jam',
    'Metode Pembayaran',
    'Nama Item',
    'Qty',
    'Harga Satuan',
    'Subtotal Item',
    'Total Transaksi',
    'Jumlah Bayar',
    'Kembalian',
  ];

  const rows: string[][] = [];
  for (const t of transactions) {
    for (const item of t.items) {
      rows.push([
        t.invoice_no,
        formatDateTime(t.created_at),
        t.payment_method,
        item.product_name,
        String(item.qty),
        String(item.price),
        String(item.subtotal),
        String(t.total),
        String(t.amount_paid),
        String(t.change),
      ]);
    }
  }

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `laporan-penjualan-cafe-desa-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(transactions: TransactionWithItems[]): void {
  const headers = [
    'No. Invoice',
    'Tanggal & Jam',
    'Metode Pembayaran',
    'Nama Item',
    'Qty',
    'Harga Satuan',
    'Subtotal Item',
    'Total Transaksi',
    'Jumlah Bayar',
    'Kembalian',
  ];

  const rows: (string | number)[][] = [];
  for (const t of transactions) {
    for (const item of t.items) {
      rows.push([
        t.invoice_no,
        formatDateTime(t.created_at),
        t.payment_method,
        item.product_name,
        item.qty,
        item.price,
        item.subtotal,
        t.total,
        t.amount_paid,
        t.change,
      ]);
    }
  }

  const tableRows = [headers, ...rows]
    .map((r) => `<tr>${r.map((c) => `<td>${String(c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`)
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Laporan Penjualan</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <table border="1">
        <thead><tr style="background-color:#C07E5A;color:white;font-weight:bold">${headers.map((h) => `<td>${h}</td>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `laporan-penjualan-cafe-desa-${dateStr}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
