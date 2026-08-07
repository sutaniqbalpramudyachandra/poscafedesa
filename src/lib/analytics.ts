import type { TransactionItem } from './supabase';

export type ProductSales = {
  productName: string;
  totalQty: number;
  totalRevenue: number;
};

export function aggregateProductSales(items: TransactionItem[]): ProductSales[] {
  const map = new Map<string, ProductSales>();
  for (const item of items) {
    const existing = map.get(item.product_name);
    if (existing) {
      existing.totalQty += item.qty;
      existing.totalRevenue += item.subtotal;
    } else {
      map.set(item.product_name, {
        productName: item.product_name,
        totalQty: item.qty,
        totalRevenue: item.subtotal,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
}

export function getTopSelling(items: TransactionItem[], limit = 5): ProductSales[] {
  return aggregateProductSales(items).slice(0, limit);
}

export function getLeastSelling(items: TransactionItem[], limit = 5): ProductSales[] {
  return aggregateProductSales(items).reverse().slice(0, limit);
}

export type DailyRevenue = {
  date: string;
  label: string;
  revenue: number;
  count: number;
};

export function aggregateDailyRevenue(
  transactions: { created_at: string; total: number }[]
): DailyRevenue[] {
  const map = new Map<string, DailyRevenue>();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (const t of sorted) {
    const d = new Date(t.created_at);
    const key = d.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d);
    const existing = map.get(key);
    if (existing) {
      existing.revenue += t.total;
      existing.count += 1;
    } else {
      map.set(key, { date: key, label, revenue: t.total, count: 1 });
    }
  }
  return Array.from(map.values());
}
