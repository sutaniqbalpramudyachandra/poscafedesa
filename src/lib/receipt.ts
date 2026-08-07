import type { TransactionWithItems, AppSettings } from './supabase';
import { formatRupiah, formatDateTime } from './format';

const RECEIPT_WIDTH = 384;
const PADDING = 24;
const LINE_HEIGHT = 18;
const CONTENT_WIDTH = RECEIPT_WIDTH - PADDING * 2;

function escapeText(s: string): string {
  return s;
}

type LayoutItem =
  | { type: 'divider' }
  | { type: 'spacer'; h: number }
  | { type: 'center'; text: string; bold?: boolean; size?: number; color?: string }
  | { type: 'row'; label: string; value: string; bold?: boolean; size?: number }
  | { type: 'item'; name: string; qty: string; price: string; subtotal: string }
  | { type: 'itemDetail'; text: string };

export function generateReceiptDataURL(t: TransactionWithItems, settings: AppSettings): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = RECEIPT_WIDTH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const layout: LayoutItem[] = [];

    if (settings.logo_url) {
      layout.push({ type: 'spacer', h: 56 });
    }

    layout.push({ type: 'center', text: settings.cafe_name.toUpperCase(), bold: true, size: 16 });
    if (settings.address) layout.push({ type: 'center', text: settings.address, size: 11, color: '#666' });
    if (settings.phone) layout.push({ type: 'center', text: `Telp. ${settings.phone}`, size: 11, color: '#666' });

    layout.push({ type: 'divider' });
    layout.push({ type: 'row', label: 'No. Invoice', value: t.invoice_no, size: 11 });
    layout.push({ type: 'row', label: 'Tanggal', value: formatDateTime(t.created_at), size: 11 });
    layout.push({ type: 'row', label: 'Pembayaran', value: t.payment_method, size: 11 });
    if (t.table_number) layout.push({ type: 'row', label: 'Meja', value: t.table_number, size: 11 });

    layout.push({ type: 'divider' });

    for (const item of t.items) {
      layout.push({ type: 'item', name: item.product_name, qty: '', price: '', subtotal: '' });
      layout.push({
        type: 'itemDetail',
        text: `${item.qty} x ${formatRupiah(item.price)}`,
      });
      layout.push({
        type: 'itemDetail',
        text: `${formatRupiah(item.subtotal)}`,
      });
    }

    layout.push({ type: 'divider' });
    layout.push({ type: 'row', label: 'Subtotal', value: formatRupiah(t.subtotal), size: 12 });
    layout.push({ type: 'row', label: 'TOTAL', value: formatRupiah(t.total), bold: true, size: 14 });
    layout.push({ type: 'row', label: `Bayar (${t.payment_method})`, value: formatRupiah(t.amount_paid), size: 11 });
    if (t.change > 0) layout.push({ type: 'row', label: 'Kembalian', value: formatRupiah(t.change), size: 11 });

    layout.push({ type: 'divider' });
    layout.push({ type: 'center', text: 'Terima kasih atas kunjungan Anda!', size: 11, color: '#666' });
    layout.push({ type: 'center', text: 'Selamat menikmati :)', size: 11, color: '#666' });
    layout.push({ type: 'spacer', h: 8 });

    // Calculate height
    let height = PADDING;
    for (const item of layout) {
      if (item.type === 'divider') height += 10;
      else if (item.type === 'spacer') height += item.h;
      else if (item.type === 'center') height += (item.size ?? 12) + 4;
      else if (item.type === 'row') height += LINE_HEIGHT;
      else if (item.type === 'item') height += LINE_HEIGHT;
      else if (item.type === 'itemDetail') height += 16;
    }
    height += PADDING;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, RECEIPT_WIDTH, height);

    // Draw logo if present
    let y = PADDING;
    const drawRest = () => {
      ctx.textAlign = 'left';
      for (const item of layout) {
        if (item.type === 'divider') {
          ctx.strokeStyle = '#bbb';
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(PADDING, y + 5);
          ctx.lineTo(RECEIPT_WIDTH - PADDING, y + 5);
          ctx.stroke();
          ctx.setLineDash([]);
          y += 10;
        } else if (item.type === 'spacer') {
          y += item.h;
        } else if (item.type === 'center') {
          ctx.fillStyle = item.color ?? '#222';
          ctx.font = `${item.bold ? 'bold ' : ''}${item.size ?? 12}px 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(escapeText(item.text), RECEIPT_WIDTH / 2, y + (item.size ?? 12));
          ctx.textAlign = 'left';
          y += (item.size ?? 12) + 4;
        } else if (item.type === 'row') {
          ctx.fillStyle = '#222';
          ctx.font = `${item.bold ? 'bold ' : ''}${item.size ?? 12}px 'Courier New', monospace`;
          ctx.fillText(item.label, PADDING, y + (item.size ?? 12));
          const valWidth = ctx.measureText(item.value).width;
          ctx.fillText(item.value, RECEIPT_WIDTH - PADDING - valWidth, y + (item.size ?? 12));
          y += LINE_HEIGHT;
        } else if (item.type === 'item') {
          ctx.fillStyle = '#222';
          ctx.font = `bold 12px 'Courier New', monospace`;
          ctx.fillText(escapeText(item.name), PADDING, y + 12);
          y += LINE_HEIGHT;
        } else if (item.type === 'itemDetail') {
          ctx.fillStyle = '#666';
          ctx.font = `11px 'Courier New', monospace`;
          if (item.text.includes(' x ')) {
            ctx.fillText(item.text, PADDING + 8, y + 11);
          } else {
            const valWidth = ctx.measureText(item.text).width;
            ctx.fillText(item.text, RECEIPT_WIDTH - PADDING - valWidth, y + 11);
          }
          y += 16;
        }
      }
      resolve(canvas.toDataURL('image/png'));
    };

    if (settings.logo_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const logoSize = 48;
        const x = (RECEIPT_WIDTH - logoSize) / 2;
        ctx.drawImage(img, x, y, logoSize, logoSize);
        y += 56;
        drawRest();
      };
      img.onerror = () => {
        // skip logo on error
        const spacerIdx = layout.findIndex((i) => i.type === 'spacer' && i.h === 56);
        if (spacerIdx >= 0) layout.splice(spacerIdx, 1);
        y = PADDING;
        // recalc height without logo spacer
        drawRest();
      };
      img.src = settings.logo_url;
    } else {
      drawRest();
    }
  });
}

export function downloadReceiptImage(dataUrl: string, invoiceNo: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `struk-${invoiceNo}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
