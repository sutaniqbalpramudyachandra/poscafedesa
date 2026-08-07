import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type Product, type TransactionWithItems, type AppSettings } from '@/lib/supabase';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { generateReceiptDataURL, downloadReceiptImage } from '@/lib/receipt';
import { cacheProducts, getCachedProducts, enqueueTransaction, saveLocalTransaction, type LocalTransaction, type LocalTransactionItem } from '@/lib/db';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  Banknote,
  QrCode,
  X,
  CheckCircle2,
  Wallet,
  Receipt,
  Loader2,
  Clock,
  Table2,
  Ban,
  Boxes,
  ZoomIn,
  Download,
  Eye,
} from 'lucide-react';

export type CartItem = {
  product: Product;
  qty: number;
};

type POSPageProps = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onTransactionComplete: () => void;
  settings: AppSettings;
};

export function POSPage({ cart, setCart, onTransactionComplete, settings }: POSPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionWithItems | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showUnpaid, setShowUnpaid] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category, name');
      if (error) {
        const cached = await getCachedProducts().catch(() => []);
        if (cached.length > 0) {
          setProducts(cached as Product[]);
        } else {
          setError('Gagal memuat produk. Periksa koneksi lalu coba lagi.');
        }
      } else {
        setProducts(data as Product[]);
        await cacheProducts(data as Product[]).catch(() => {});
      }
    } else {
      const cached = await getCachedProducts().catch(() => []);
      if (cached.length > 0) {
        setProducts(cached as Product[]);
      } else {
        setError('Sedang offline dan belum ada data produk tersimpan.');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['Semua', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === 'Semua' || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, activeCategory]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, qty: i.qty + delta } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Katalog Produk</h2>
              <p className="text-sm text-cafe-500">Pilih item untuk ditambahkan ke keranjang</p>
            </div>
            <button
              onClick={() => setShowUnpaid(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors active:scale-95 border border-amber-200"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Bayar Nanti</span>
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-cafe-600 text-cream-50 shadow-md'
                    : 'bg-white text-cafe-600 border border-cafe-200 hover:bg-cafe-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-cafe-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-cafe-600 text-sm mb-3">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
              >
                Coba lagi
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-cafe-400 text-sm">
              Produk tidak ditemukan
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((i) => i.product.id === product.id);
                const outOfStock = product.stock === 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={`group relative bg-white rounded-xl border border-cafe-100 p-4 text-left transition-all ${
                      outOfStock
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-lg hover:border-cafe-300 hover:-translate-y-0.5 active:scale-95'
                    } animate-fade-in`}
                  >
                    <div className="w-full aspect-square mb-3 rounded-lg bg-gradient-to-br from-cafe-100 to-cafe-200 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CoffeeIcon category={product.category} />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-cafe-900 leading-tight truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-cafe-400 mt-0.5">{product.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-display font-bold text-cafe-700 text-base">
                        {formatRupiah(product.price)}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          product.stock === -1
                            ? 'bg-gray-100 text-gray-500'
                            : product.stock === 0
                            ? 'bg-red-100 text-red-600'
                            : product.stock <= 5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {product.stock === -1 ? 'Tersedia' : `Stok ${product.stock}`}
                      </span>
                    </div>
                    {cartItem && (
                      <span className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 bg-cafe-600 text-cream-50 text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-scale-in">
                        {cartItem.qty}
                      </span>
                    )}
                    {!outOfStock && (
                      <div className="absolute inset-0 rounded-xl bg-cafe-900/0 group-hover:bg-cafe-900/0 flex items-center justify-center pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-cafe-600 text-cream-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg absolute bottom-3 right-3">
                          <Plus className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
          <CartPanel
            cart={cart}
            subtotal={subtotal}
            cartCount={cartCount}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
            onCheckout={() => setShowCheckout(true)}
            onClear={() => setCart([])}
          />
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          setCart={setCart}
          products={products}
          subtotal={subtotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={(tx) => {
            setShowCheckout(false);
            setLastTransaction(tx);
            setShowSuccess(true);
            setCart([]);
            onTransactionComplete();
          }}
          onUnpaidSuccess={(tx) => {
            setShowCheckout(false);
            setCart([]);
            onTransactionComplete();
            setLastTransaction(tx);
            setShowSuccess(true);
          }}
          processing={processing}
          setProcessing={setProcessing}
          settings={settings}
        />
      )}

      {showSuccess && lastTransaction && (
        <SuccessToast
          transaction={lastTransaction}
          settings={settings}
          onClose={() => {
            setShowSuccess(false);
            setLastTransaction(null);
          }}
        />
      )}

      {showMobileCart && (
        <MobileCartDrawer
          cart={cart}
          subtotal={subtotal}
          cartCount={cartCount}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onCheckout={() => {
            setShowMobileCart(false);
            setShowCheckout(true);
          }}
          onClear={() => setCart([])}
          onClose={() => setShowMobileCart(false)}
        />
      )}

      {showUnpaid && (
        <UnpaidOrdersModal
          settings={settings}
          products={products}
          onClose={() => setShowUnpaid(false)}
          onPaid={() => {
            onTransactionComplete();
          }}
        />
      )}

      <MobileCartBar
        cartCount={cartCount}
        subtotal={subtotal}
        onClick={() => setShowMobileCart(true)}
      />
    </div>
  );
}

function CoffeeIcon({ category }: { category: string }) {
  const emoji = category === 'Kopi' ? '☕' : category === 'Teh' ? '🫖' : category === 'Makanan' ? '🍽️' : category === 'Rokok' ? '🚬' : '🥤';
  return <span className="text-3xl opacity-60">{emoji}</span>;
}

function CartPanel({
  cart,
  subtotal,
  cartCount,
  onUpdateQty,
  onRemove,
  onCheckout,
  onClear,
}: {
  cart: CartItem[];
  subtotal: number;
  cartCount: number;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onClear: () => void;
}) {
  return (
    <div className="sticky top-22 bg-white rounded-xl border border-cafe-100 shadow-sm flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between p-4 border-b border-cafe-100">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-cafe-600" />
          <h3 className="font-display font-bold text-cafe-900">Keranjang</h3>
          {cartCount > 0 && (
            <span className="px-2 py-0.5 bg-cafe-100 text-cafe-700 text-xs font-bold rounded-full">
              {cartCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-cafe-400 hover:text-red-500 font-medium transition-colors"
          >
            Kosongkan
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cafe-300">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p className="text-sm text-cafe-400">Keranjang masih kosong</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-2 bg-cafe-50 rounded-lg p-2.5 animate-slide-in-right"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cafe-900 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-cafe-500">{formatRupiah(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateQty(item.product.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-cafe-200 flex items-center justify-center text-cafe-600 hover:bg-cafe-100 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, 1)}
                    className="w-7 h-7 rounded-lg bg-cafe-600 text-cream-50 flex items-center justify-center hover:bg-cafe-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onRemove(item.product.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-cafe-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-cafe-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-cafe-500">Total</span>
          <span className="font-display font-extrabold text-xl text-cafe-800">
            {formatRupiah(subtotal)}
          </span>
        </div>
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full py-3.5 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Wallet className="w-5 h-5" />
          Bayar Sekarang
        </button>
      </div>
    </div>
  );
}

function MobileCartDrawer({
  cart,
  subtotal,
  cartCount,
  onUpdateQty,
  onRemove,
  onCheckout,
  onClear,
  onClose,
}: {
  cart: CartItem[];
  subtotal: number;
  cartCount: number;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl w-full max-h-[88vh] flex flex-col shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-cafe-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cafe-600" />
            <h3 className="font-display font-bold text-cafe-900">Keranjang</h3>
            {cartCount > 0 && (
              <span className="px-2 py-0.5 bg-cafe-100 text-cafe-700 text-xs font-bold rounded-full">
                {cartCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs text-cafe-400 hover:text-red-500 font-medium transition-colors"
              >
                Kosongkan
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-cafe-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-cafe-300">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm text-cafe-400">Keranjang masih kosong</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 bg-white rounded-lg p-3 border border-cafe-100 animate-slide-in-right"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cafe-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-cafe-500">{formatRupiah(item.product.price)}</p>
                    <p className="text-xs font-bold text-cafe-700 mt-0.5">
                      {formatRupiah(item.product.price * item.qty)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-cafe-600 text-cream-50 flex items-center justify-center hover:bg-cafe-700 transition-colors active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-center text-sm font-bold tabular-nums py-0.5">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-white border border-cafe-200 flex items-center justify-center text-cafe-600 hover:bg-cafe-100 transition-colors active:scale-90"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(item.product.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-cafe-300 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-cafe-100 space-y-3 bg-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-cafe-500">Total</span>
            <span className="font-display font-extrabold text-xl text-cafe-800">
              {formatRupiah(subtotal)}
            </span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Bayar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileCartBar({
  cartCount,
  subtotal,
  onClick,
}: {
  cartCount: number;
  subtotal: number;
  onClick: () => void;
}) {
  if (cartCount === 0) return null;
  return (
    <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 px-4 pb-3 animate-slide-up">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between bg-cafe-700 text-cream-50 rounded-2xl p-4 shadow-xl active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 min-w-[18px] h-4.5 px-1 bg-amber-400 text-cafe-900 text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-cafe-200 leading-none">{cartCount} item · Tap untuk edit</p>
            <p className="font-display font-bold text-base leading-none mt-0.5">
              {formatRupiah(subtotal)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-display font-bold text-sm bg-cream-50/15 px-4 py-2 rounded-lg">
          Bayar <Wallet className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}

type CheckoutModalProps = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  products: Product[];
  subtotal: number;
  onClose: () => void;
  onSuccess: (tx: TransactionWithItems) => void;
  onUnpaidSuccess: (tx: TransactionWithItems) => void;
  processing: boolean;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  settings: AppSettings;
};

function CheckoutModal({
  cart,
  setCart,
  products,
  subtotal,
  onClose,
  onSuccess,
  onUnpaidSuccess,
  processing,
  setProcessing,
  settings,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [payMode, setPayMode] = useState<'now' | 'later'>('now');
  const [tableNumber, setTableNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showQRZoom, setShowQRZoom] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const total = subtotal;
  const paidNum = parseInt(amountPaid || '0', 10) || 0;
  const change = paymentMethod === 'Tunai' ? Math.max(0, paidNum - total) : total;
  const isExactOrEnough = payMode === 'later' || paymentMethod === 'QRIS' || paidNum >= total;

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, qty: i.qty + delta } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const addProductToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const filteredProductsToAdd = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      p.stock !== 0
  );

  const quickAmounts = [total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, 50000, 100000]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

  const generateInvoiceNo = async () => {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    const seq = (count ?? 0) + 1;
    return `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
  };

  const decrementStock = async (items: CartItem[]) => {
    for (const item of items) {
      if (item.product.stock === -1) continue;
      const newStock = item.product.stock - item.qty;
      await supabase
        .from('products')
        .update({ stock: Math.max(0, newStock) })
        .eq('id', item.product.id);
    }
  };

  const handleCheckout = async () => {
    setError(null);

    if (cart.length === 0) {
      setError('Keranjang masih kosong.');
      return;
    }

    if (payMode === 'now' && paymentMethod === 'Tunai' && paidNum < total) {
      setError('Jumlah uang yang dibayar kurang dari total.');
      return;
    }

    setProcessing(true);

    try {
      const invoiceNo = await generateInvoiceNo();
      const isUnpaid = payMode === 'later';

      const txTimestamp = new Date().toISOString();
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const items: LocalTransactionItem[] = cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        qty: item.qty,
        price: item.product.price,
        subtotal: item.product.price * item.qty,
      }));

      const localTx: LocalTransaction = {
        localId,
        invoice_no: invoiceNo,
        payment_method: isUnpaid ? 'Tunai' : paymentMethod,
        subtotal,
        total,
        amount_paid: isUnpaid ? 0 : paymentMethod === 'QRIS' ? total : paidNum,
        change: isUnpaid ? 0 : paymentMethod === 'QRIS' ? 0 : change,
        status: isUnpaid ? 'unpaid' : 'paid',
        table_number: tableNumber.trim() || null,
        created_at: txTimestamp,
        items,
        synced: false,
      };

      if (!navigator.onLine) {
        await saveLocalTransaction(localTx);
        await enqueueTransaction(localTx);
        setProcessing(false);
        const fullTx = {
          id: localId,
          invoice_no: invoiceNo,
          payment_method: localTx.payment_method as 'Tunai' | 'QRIS',
          subtotal,
          total,
          amount_paid: localTx.amount_paid,
          change: localTx.change,
          status: localTx.status as 'paid' | 'unpaid' | 'cancelled',
          table_number: localTx.table_number,
          created_at: txTimestamp,
          items: items.map((it, idx) => ({
            id: `${localId}-${idx}`,
            transaction_id: localId,
            ...it,
          })),
        } as TransactionWithItems;
        if (isUnpaid) {
          onUnpaidSuccess(fullTx);
        } else {
          onSuccess(fullTx);
        }
        return;
      }

      const insertData: Record<string, unknown> = {
        invoice_no: invoiceNo,
        payment_method: localTx.payment_method,
        subtotal,
        total,
        amount_paid: localTx.amount_paid,
        change: localTx.change,
        status: localTx.status,
        table_number: localTx.table_number,
      };

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();

      if (txError || !txData) {
        await saveLocalTransaction(localTx);
        await enqueueTransaction(localTx);
        setProcessing(false);
        const fullTx = {
          id: localId,
          invoice_no: invoiceNo,
          payment_method: localTx.payment_method as 'Tunai' | 'QRIS',
          subtotal,
          total,
          amount_paid: localTx.amount_paid,
          change: localTx.change,
          status: localTx.status as 'paid' | 'unpaid' | 'cancelled',
          table_number: localTx.table_number,
          created_at: txTimestamp,
          items: items.map((it, idx) => ({
            id: `${localId}-${idx}`,
            transaction_id: localId,
            ...it,
          })),
        } as TransactionWithItems;
        if (isUnpaid) {
          onUnpaidSuccess(fullTx);
        } else {
          onSuccess(fullTx);
        }
        return;
      }

      const itemsToInsert = cart.map((item) => ({
        transaction_id: txData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        qty: item.qty,
        price: item.product.price,
        subtotal: item.product.price * item.qty,
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError || !itemsData) {
        await supabase.from('transactions').delete().eq('id', txData.id);
        await saveLocalTransaction(localTx);
        await enqueueTransaction(localTx);
        setProcessing(false);
        const fullTx = {
          id: localId,
          invoice_no: invoiceNo,
          payment_method: localTx.payment_method as 'Tunai' | 'QRIS',
          subtotal,
          total,
          amount_paid: localTx.amount_paid,
          change: localTx.change,
          status: localTx.status as 'paid' | 'unpaid' | 'cancelled',
          table_number: localTx.table_number,
          created_at: txTimestamp,
          items: items.map((it, idx) => ({
            id: `${localId}-${idx}`,
            transaction_id: localId,
            ...it,
          })),
        } as TransactionWithItems;
        if (isUnpaid) {
          onUnpaidSuccess(fullTx);
        } else {
          onSuccess(fullTx);
        }
        return;
      }

      if (!isUnpaid) {
        await decrementStock(cart);
      }

      const fullTx: TransactionWithItems = {
        ...txData,
        items: itemsData as TransactionWithItems['items'],
      };
      setProcessing(false);
      if (isUnpaid) {
        onUnpaidSuccess(fullTx);
      } else {
        onSuccess(fullTx);
      }
    } catch {
      setError('Terjadi kesalahan tak terduga. Coba lagi.');
      setProcessing(false);
    }
  };

  const showPayment = payMode === 'now';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-cream-50 flex items-center justify-between p-5 border-b border-cafe-100 z-10">
          <h3 className="font-display font-bold text-lg text-cafe-900">Pembayaran</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cafe-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-white rounded-xl p-4 border border-cafe-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-cafe-500">Total Belanja</p>
              <p className="text-xs text-cafe-400">{cart.reduce((s, i) => s + i.qty, 0)} item</p>
            </div>
            <p className="font-display font-extrabold text-3xl text-cafe-800">{formatRupiah(total)}</p>
          </div>

          {/* Cart items list with edit/delete */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-cafe-700">Item Pesanan</label>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="flex items-center gap-1 text-xs font-bold text-cafe-600 hover:text-cafe-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Item
              </button>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-xl border border-cafe-200 p-3 mb-2 animate-slide-up">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1">
                  {filteredProductsToAdd.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-cafe-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-cafe-800 truncate">{p.name}</p>
                        <p className="text-xs text-cafe-400">{formatRupiah(p.price)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                        p.stock === -1 ? 'bg-gray-100 text-gray-500' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {p.stock === -1 ? 'Tersedia' : `Stok ${p.stock}`}
                      </span>
                    </button>
                  ))}
                  {filteredProductsToAdd.length === 0 && (
                    <p className="text-sm text-cafe-400 text-center py-3">Produk tidak ditemukan</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-cafe-100 divide-y divide-cafe-100 max-h-52 overflow-y-auto scrollbar-thin">
              {cart.length === 0 ? (
                <p className="text-sm text-cafe-400 text-center py-6">Keranjang kosong</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cafe-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-cafe-500">{formatRupiah(item.product.price)} × {item.qty} = <span className="font-semibold text-cafe-700">{formatRupiah(item.product.price * item.qty)}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-7 h-7 rounded-lg bg-cafe-50 border border-cafe-200 flex items-center justify-center text-cafe-600 hover:bg-cafe-100 transition-colors active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        className="w-7 h-7 rounded-lg bg-cafe-600 text-cream-50 flex items-center justify-center hover:bg-cafe-700 transition-colors active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-cafe-300 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Table Number */}
          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-1.5">
              <Table2 className="w-4 h-4 text-cafe-400" />
              Nomor Meja <span className="text-cafe-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: Meja 5"
              className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Pay Mode: Now vs Later */}
          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Status Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayMode('now')}
                className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all ${
                  payMode === 'now'
                    ? 'border-cafe-600 bg-cafe-50 text-cafe-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span className="font-semibold text-sm">Bayar Sekarang</span>
              </button>
              <button
                onClick={() => setPayMode('later')}
                className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all ${
                  payMode === 'later'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-semibold text-sm">Bayar Nanti</span>
              </button>
            </div>
          </div>

          {showPayment && (
            <div className="animate-fade-in">
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('Tunai')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'Tunai'
                      ? 'border-cafe-600 bg-cafe-50 text-cafe-700'
                      : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                  <span className="font-semibold text-sm">Tunai</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'QRIS'
                      ? 'border-cafe-600 bg-cafe-50 text-cafe-700'
                      : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="font-semibold text-sm">QRIS</span>
                </button>
              </div>
            </div>
          )}

          {showPayment && paymentMethod === 'Tunai' && (
            <div className="animate-fade-in">
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Jumlah Uang Diterima</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-400 font-semibold">Rp</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-cafe-200 rounded-xl text-lg font-bold text-cafe-900 focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountPaid(String(amt))}
                    className="px-3 py-1.5 bg-cafe-100 text-cafe-700 rounded-lg text-xs font-bold hover:bg-cafe-200 transition-colors"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
                <button
                  onClick={() => setAmountPaid(String(total))}
                  className="px-3 py-1.5 bg-cafe-200 text-cafe-800 rounded-lg text-xs font-bold hover:bg-cafe-300 transition-colors"
                >
                  Uang Pas
                </button>
              </div>
              {paidNum > 0 && (
                <div className="mt-3 flex items-center justify-between bg-cafe-50 rounded-lg px-4 py-3">
                  <span className="text-sm text-cafe-600 font-medium">Kembalian</span>
                  <span className="font-display font-bold text-lg text-cafe-800">
                    {formatRupiah(Math.max(0, paidNum - total))}
                  </span>
                </div>
              )}
            </div>
          )}

          {showPayment && paymentMethod === 'QRIS' && (
            <div className="bg-white rounded-xl p-4 border border-cafe-100 text-center animate-fade-in">
              <button
                onClick={() => settings.qr_code_url && setShowQRZoom(true)}
                className="w-56 h-56 mx-auto bg-cafe-50 rounded-2xl flex items-center justify-center mb-3 overflow-hidden border border-cafe-100 relative group cursor-zoom-in"
                disabled={!settings.qr_code_url}
              >
                {settings.qr_code_url ? (
                  <>
                    <img src={settings.qr_code_url} alt="QRIS" className="w-full h-full object-contain p-3" />
                    <span className="absolute bottom-2 right-2 bg-cafe-800/70 text-cream-50 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </>
                ) : (
                  <QrCode className="w-24 h-24 text-cafe-300" />
                )}
              </button>
              <p className="text-sm font-semibold text-cafe-700">Scan QRIS untuk membayar</p>
              <p className="text-xs text-cafe-400 mt-1">
                {settings.qr_code_url
                  ? 'Ketuk QR code untuk perbesar · Pelanggan scan kode, lalu konfirmasi pembayaran'
                  : 'Unggah QR code di menu Pengaturan untuk menampilkan kode'}
              </p>
            </div>
          )}

          {payMode === 'later' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-fade-in">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-800">Pesanan Ditunda</p>
              <p className="text-xs text-amber-600 mt-1">
                Pesanan akan tercatat sebagai <span className="font-semibold">belum bayar</span>.
                Anda bisa menyelesaikan pembayaran nanti dari menu "Bayar Nanti".
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={processing || !isExactOrEnough || cart.length === 0}
            className={`w-full py-4 text-cream-50 rounded-xl font-display font-bold text-base shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 ${
              payMode === 'later' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cafe-600 hover:bg-cafe-700'
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Memproses...
              </>
            ) : payMode === 'later' ? (
              <>
                <Clock className="w-5 h-5" />
                Simpan Pesanan
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Konfirmasi Pembayaran
              </>
            )}
          </button>
        </div>
      </div>

      {showQRZoom && settings.qr_code_url && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-cafe-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowQRZoom(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQRZoom(false)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-cafe-100 transition-colors"
            >
              <X className="w-5 h-5 text-cafe-700" />
            </button>
            <img
              src={settings.qr_code_url}
              alt="QRIS"
              className="max-w-[85vw] max-h-[85vh] rounded-2xl bg-white p-4 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessToast({
  transaction,
  settings,
  onClose,
}: {
  transaction: TransactionWithItems;
  settings: AppSettings;
  onClose: () => void;
}) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleViewReceipt = async () => {
    setLoadingReceipt(true);
    const url = await generateReceiptDataURL(transaction, settings);
    setReceiptUrl(url);
    setLoadingReceipt(false);
    setShowReceipt(true);
  };

  return (
    <>
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 animate-slide-up">
        <div className="bg-green-600 text-white rounded-2xl shadow-2xl p-4 max-w-xs flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Transaksi Berhasil!</p>
            <p className="text-xs text-green-100 mt-0.5">{transaction.invoice_no}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleViewReceipt}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Lihat Struk
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReceipt && (
        <ReceiptImageModal
          dataUrl={receiptUrl}
          loading={loadingReceipt}
          invoiceNo={transaction.invoice_no}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}

function ReceiptImageModal({
  dataUrl,
  loading,
  invoiceNo,
  onClose,
}: {
  dataUrl: string;
  loading: boolean;
  invoiceNo: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
              alt={`Struk ${invoiceNo}`}
              className="w-full max-w-[340px] rounded-lg shadow-md border border-cafe-100"
            />
          ) : (
            <p className="text-sm text-cafe-400 text-center py-16">Gagal membuat struk.</p>
          )}
        </div>
        <div className="p-4 border-t border-cafe-100 bg-white">
          <button
            onClick={() => downloadReceiptImage(dataUrl, invoiceNo)}
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

function UnpaidOrdersModal({
  settings,
  products,
  onClose,
  onPaid,
}: {
  settings: AppSettings;
  products: Product[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const [unpaidTx, setUnpaidTx] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState<TransactionWithItems | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TransactionWithItems | null>(null);

  const fetchUnpaid = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'unpaid')
      .order('created_at', { ascending: true });

    if (error) {
      setError('Gagal memuat pesanan belum bayar.');
      setLoading(false);
      return;
    }

    const txList = (data ?? []) as TransactionWithItems[];
    if (txList.length === 0) {
      setUnpaidTx([]);
      setLoading(false);
      return;
    }

    const txIds = txList.map((t) => t.id);
    const { data: itemsData } = await supabase
      .from('transaction_items')
      .select('*')
      .in('transaction_id', txIds);

    const itemsByTx = new Map<string, TransactionWithItems['items']>();
    for (const item of (itemsData ?? []) as TransactionWithItems['items']) {
      const arr = itemsByTx.get(item.transaction_id) ?? [];
      arr.push(item);
      itemsByTx.set(item.transaction_id, arr);
    }

    setUnpaidTx(txList.map((t) => ({ ...t, items: itemsByTx.get(t.id) ?? [] })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnpaid();
  }, [fetchUnpaid]);

  const handleMarkPaid = async (
    tx: TransactionWithItems,
    method: 'Tunai' | 'QRIS',
    amountPaid: number,
    updatedItems?: { product_id: string; product_name: string; qty: number; price: number; subtotal: number }[]
  ) => {
    setPayingId(tx.id);
    const change = method === 'QRIS' ? 0 : Math.max(0, amountPaid - tx.total);
    const newTotal = updatedItems ? updatedItems.reduce((s, i) => s + i.subtotal, 0) : tx.total;

    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'paid',
        payment_method: method,
        amount_paid: method === 'QRIS' ? newTotal : amountPaid,
        change: method === 'QRIS' ? 0 : Math.max(0, amountPaid - newTotal),
        subtotal: newTotal,
        total: newTotal,
      })
      .eq('id', tx.id);

    if (error) {
      setError('Gagal menandai sebagai lunas.');
      setPayingId(null);
      return;
    }

    if (updatedItems) {
      await supabase.from('transaction_items').delete().eq('transaction_id', tx.id);
      await supabase.from('transaction_items').insert(
        updatedItems.map((i) => ({ ...i, transaction_id: tx.id }))
      );

      for (const item of updatedItems) {
        const product = products.find((p) => p.id === item.product_id);
        if (product && product.stock !== -1) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, product.stock - item.qty) })
            .eq('id', product.id);
        }
      }
    } else {
      for (const item of tx.items) {
        if (item.product_id) {
          const product = products.find((p) => p.id === item.product_id);
          if (product && product.stock !== -1) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, product.stock - item.qty) })
              .eq('id', product.id);
          }
        }
      }
    }

    setPayingId(null);
    setShowPayModal(null);
    fetchUnpaid();
    onPaid();
  };

  const handleCancel = async (tx: TransactionWithItems) => {
    setCancellingId(tx.id);
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', tx.id);

    if (error) {
      setError('Gagal membatalkan pesanan.');
      setCancellingId(null);
      return;
    }

    setCancellingId(null);
    setCancelTarget(null);
    fetchUnpaid();
    onPaid();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-cream-50 flex items-center justify-between p-5 border-b border-cafe-100 z-10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-lg text-cafe-900">Pesanan Belum Bayar</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cafe-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-cafe-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-cafe-600 text-sm mb-3">{error}</p>
              <button
                onClick={fetchUnpaid}
                className="px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
              >
                Coba lagi
              </button>
            </div>
          ) : unpaidTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-cafe-300">
              <CheckCircle2 className="w-12 h-12 mb-3 text-green-400" />
              <p className="text-sm text-cafe-400 font-medium">Semua pesanan sudah lunas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidTx.map((tx) => (
                <UnpaidOrderCard
                  key={tx.id}
                  tx={tx}
                  onPay={() => setShowPayModal(tx)}
                  onCancel={() => setCancelTarget(tx)}
                  paying={payingId === tx.id}
                  cancelling={cancellingId === tx.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showPayModal && (
        <PayUnpaidModal
          tx={showPayModal}
          settings={settings}
          products={products}
          onClose={() => setShowPayModal(null)}
          onConfirm={(method, amount, updatedItems) => handleMarkPaid(showPayModal, method, amount, updatedItems)}
        />
      )}

      {cancelTarget && (
        <CancelConfirmModal
          tx={cancelTarget}
          cancelling={cancellingId === cancelTarget.id}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => handleCancel(cancelTarget)}
        />
      )}
    </div>
  );
}

function UnpaidOrderCard({
  tx,
  onPay,
  onCancel,
  paying,
  cancelling,
}: {
  tx: TransactionWithItems;
  onPay: () => void;
  onCancel: () => void;
  paying: boolean;
  cancelling: boolean;
}) {
  const busy = paying || cancelling;
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              BELUM BAYAR
            </span>
            {tx.table_number && (
              <span className="flex items-center gap-1 text-xs font-semibold text-cafe-600 bg-cafe-50 px-2 py-0.5 rounded-full">
                <Table2 className="w-3 h-3" />
                {tx.table_number}
              </span>
            )}
          </div>
          <p className="text-xs text-cafe-400 mt-1.5">{tx.invoice_no} · {formatDateTime(tx.created_at)}</p>
        </div>
        <p className="font-display font-extrabold text-lg text-cafe-800">{formatRupiah(tx.total)}</p>
      </div>

      <div className="bg-cafe-50 rounded-lg p-2.5 mb-3">
        {tx.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-0.5">
            <span className="text-cafe-600">{item.qty}x {item.product_name}</span>
            <span className="text-cafe-700 font-medium">{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPay}
          disabled={busy}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {paying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
          ) : (
            <><Wallet className="w-4 h-4" /> Bayar Sekarang</>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 border border-red-200"
        >
          {cancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Ban className="w-4 h-4" /> Batal</>
          )}
        </button>
      </div>
    </div>
  );
}

function PayUnpaidModal({
  tx,
  settings,
  products,
  onClose,
  onConfirm,
}: {
  tx: TransactionWithItems;
  settings: AppSettings;
  products: Product[];
  onClose: () => void;
  onConfirm: (
    method: 'Tunai' | 'QRIS',
    amountPaid: number,
    updatedItems?: { product_id: string; product_name: string; qty: number; price: number; subtotal: number }[]
  ) => void;
}) {
  const [method, setMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState(
    tx.items.map((i) => ({
      id: i.id,
      product_id: i.product_id ?? '',
      product_name: i.product_name,
      qty: i.qty,
      price: i.price,
      subtotal: i.subtotal,
    }))
  );

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const paidNum = parseInt(amountPaid || '0', 10) || 0;
  const change = method === 'Tunai' ? Math.max(0, paidNum - total) : 0;
  const isEnough = method === 'QRIS' || paidNum >= total;

  const quickAmounts = [total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, 50000, 100000]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

  const updateItemQty = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === itemId
            ? { ...i, qty: i.qty + delta, subtotal: (i.qty + delta) * i.price }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product_id === product.id
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          price: product.price,
          subtotal: product.price,
        },
      ]);
    }
  };

  const filteredProductsToAdd = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      p.stock !== 0
  );

  const handleConfirm = () => {
    if (items.length === 0) {
      setError('Pesanan kosong. Tambahkan item atau batalkan pesanan.');
      return;
    }
    if (method === 'Tunai' && paidNum < total) {
      setError('Jumlah uang kurang dari total.');
      return;
    }
    const updatedItems = items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      qty: i.qty,
      price: i.price,
      subtotal: i.subtotal,
    }));
    onConfirm(method, method === 'QRIS' ? total : paidNum, updatedItems);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-cream-50 flex items-center justify-between p-5 border-b border-cafe-100 z-10">
          <h3 className="font-display font-bold text-lg text-cafe-900">Bayar Pesanan</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cafe-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-white rounded-xl p-4 border border-cafe-100">
            {tx.table_number && (
              <p className="text-xs text-cafe-500 mb-1 flex items-center gap-1">
                <Table2 className="w-3.5 h-3.5" /> Meja {tx.table_number}
              </p>
            )}
            <p className="text-sm text-cafe-500 mb-1">{tx.invoice_no}</p>
            <p className="font-display font-extrabold text-2xl text-cafe-800">{formatRupiah(total)}</p>
          </div>

          {/* Editable items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-cafe-700">Item Pesanan</label>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="flex items-center gap-1 text-xs font-bold text-cafe-600 hover:text-cafe-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Item
              </button>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-xl border border-cafe-200 p-3 mb-2 animate-slide-up">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1">
                  {filteredProductsToAdd.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-cafe-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-cafe-800 truncate">{p.name}</p>
                        <p className="text-xs text-cafe-400">{formatRupiah(p.price)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                        p.stock === -1 ? 'bg-gray-100 text-gray-500' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {p.stock === -1 ? 'Tersedia' : `Stok ${p.stock}`}
                      </span>
                    </button>
                  ))}
                  {filteredProductsToAdd.length === 0 && (
                    <p className="text-sm text-cafe-400 text-center py-3">Produk tidak ditemukan</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-cafe-100 divide-y divide-cafe-100 max-h-52 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <p className="text-sm text-cafe-400 text-center py-6">Pesanan kosong</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cafe-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-cafe-500">{formatRupiah(item.price)} × {item.qty} = <span className="font-semibold text-cafe-700">{formatRupiah(item.subtotal)}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateItemQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-cafe-50 border border-cafe-200 flex items-center justify-center text-cafe-600 hover:bg-cafe-100 transition-colors active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                      <button
                        onClick={() => updateItemQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-cafe-600 text-cream-50 flex items-center justify-center hover:bg-cafe-700 transition-colors active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-cafe-300 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod('Tunai')}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all ${
                  method === 'Tunai'
                    ? 'border-cafe-600 bg-cafe-50 text-cafe-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="font-semibold text-sm">Tunai</span>
              </button>
              <button
                onClick={() => setMethod('QRIS')}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all ${
                  method === 'QRIS'
                    ? 'border-cafe-600 bg-cafe-50 text-cafe-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="font-semibold text-sm">QRIS</span>
              </button>
            </div>
          </div>

          {method === 'Tunai' && (
            <div className="animate-fade-in">
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Jumlah Uang Diterima</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-400 font-semibold">Rp</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-cafe-200 rounded-xl text-lg font-bold text-cafe-900 focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountPaid(String(amt))}
                    className="px-3 py-1.5 bg-cafe-100 text-cafe-700 rounded-lg text-xs font-bold hover:bg-cafe-200 transition-colors"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
                <button
                  onClick={() => setAmountPaid(String(total))}
                  className="px-3 py-1.5 bg-cafe-200 text-cafe-800 rounded-lg text-xs font-bold hover:bg-cafe-300 transition-colors"
                >
                  Uang Pas
                </button>
              </div>
              {paidNum > 0 && (
                <div className="mt-3 flex items-center justify-between bg-cafe-50 rounded-lg px-4 py-3">
                  <span className="text-sm text-cafe-600 font-medium">Kembalian</span>
                  <span className="font-display font-bold text-lg text-cafe-800">
                    {formatRupiah(change)}
                  </span>
                </div>
              )}
            </div>
          )}

          {method === 'QRIS' && (
            <div className="bg-white rounded-xl p-4 border border-cafe-100 text-center animate-fade-in">
              <div className="w-52 h-52 mx-auto bg-cafe-50 rounded-2xl flex items-center justify-center mb-3 overflow-hidden border border-cafe-100">
                {settings.qr_code_url ? (
                  <img src={settings.qr_code_url} alt="QRIS" className="w-full h-full object-contain p-3" />
                ) : (
                  <QrCode className="w-24 h-24 text-cafe-300" />
                )}
              </div>
              <p className="text-sm font-semibold text-cafe-700">Scan QRIS untuk membayar</p>
              <p className="text-xs text-cafe-400 mt-1">Pelanggan scan kode, lalu konfirmasi pembayaran</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!isEnough || items.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-display font-bold text-base shadow-lg hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Konfirmasi Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelConfirmModal({
  tx,
  cancelling,
  onClose,
  onConfirm,
}: {
  tx: TransactionWithItems;
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-cafe-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="font-display font-bold text-lg text-cafe-900 text-center mb-1">
          Batalkan Pesanan?
        </h3>
        <p className="text-sm text-cafe-500 text-center mb-1">
          Pesanan <span className="font-semibold text-cafe-700">{tx.invoice_no}</span> akan dibatalkan.
        </p>
        <p className="text-sm text-cafe-500 text-center mb-4">
          Total: <span className="font-semibold text-cafe-700">{formatRupiah(tx.total)}</span>
        </p>

        <div className="bg-cafe-50 rounded-lg p-3 mb-5 max-h-32 overflow-y-auto scrollbar-thin">
          {tx.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-0.5">
              <span className="text-cafe-600">{item.qty}x {item.product_name}</span>
              <span className="text-cafe-700 font-medium">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 py-3 bg-cafe-100 text-cafe-700 rounded-xl font-semibold text-sm hover:bg-cafe-200 transition-colors disabled:opacity-50 active:scale-95"
          >
            Kembali
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Ban className="w-4 h-4" /> Ya, Batalkan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
