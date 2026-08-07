import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  invoice_no: string;
  payment_method: 'Tunai' | 'QRIS';
  subtotal: number;
  total: number;
  amount_paid: number;
  change: number;
  status: 'paid' | 'unpaid' | 'cancelled';
  table_number: string | null;
  created_at: string;
};

export type TransactionItem = {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type TransactionWithItems = Transaction & {
  items: TransactionItem[];
};

export type AppSettings = {
  id: number;
  cafe_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  qr_code_url: string | null;
  updated_at: string;
};

export type UserRole = 'super_admin' | 'kasir';

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};
