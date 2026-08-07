import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type Product } from '@/lib/supabase';
import { formatRupiah } from '@/lib/format';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Package,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Eye,
  Coffee,
  Utensils,
  CupSoda,
  Leaf,
  Cigarette,
  Boxes,
} from 'lucide-react';

type MenuManagementPageProps = {
  refreshKey: number;
  onMenuChanged: () => void;
};

export function MenuManagementPage({ refreshKey, onMenuChanged }: MenuManagementPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category, name');
    if (error) {
      setError('Gagal memuat daftar menu.');
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshKey]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['Semua', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'Semua' || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const activeCount = products.filter((p) => p.is_active).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) <= 0).length;

  const handleAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
    onMenuChanged();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteTarget.id);

    setIsDeleting(false);
    if (error) {
      setError('Gagal menghapus menu.');
    } else {
      setDeleteTarget(null);
      fetchProducts();
      onMenuChanged();
    }
  };

  const handleToggleActive = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    if (error) {
      setError('Gagal mengubah status menu.');
    } else {
      fetchProducts();
      onMenuChanged();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Kelola Menu & Stok</h2>
          <p className="text-sm text-cafe-500">Tambah, edit, atau atur stok produk cafe Anda</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-3 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Tambah Menu
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-cafe-100 text-cafe-600 flex items-center justify-center mb-2">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Total Menu</p>
          <p className="font-display font-bold text-sm text-cafe-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-2">
            <Eye className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Menu Aktif</p>
          <p className="font-display font-bold text-sm text-cafe-800">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-2">
            <Boxes className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Stok Habis</p>
          <p className="font-display font-bold text-sm text-cafe-800">{outOfStockCount}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari menu..."
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-cafe-300">
          <Package className="w-16 h-16 mb-4" />
          <p className="text-cafe-400 font-medium">Belum ada menu</p>
          <button
            onClick={handleAdd}
            className="mt-3 px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
          >
            Tambah menu pertama
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((product) => {
            const stockNum = product.stock ?? 0;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md animate-fade-in ${
                  product.is_active ? 'border-cafe-100' : 'border-cafe-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cafe-100 to-cafe-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon category={product.category} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-cafe-900 truncate">{product.name}</h3>
                      {!product.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-cafe-100 text-cafe-500 rounded-full">
                          Sembunyi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cafe-400 mt-0.5">{product.category}</p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-display font-bold text-cafe-700 text-sm">
                        {formatRupiah(product.price)}
                      </p>
                      <span className="text-cafe-300">•</span>
                      {/* Badge Indikator Stok */}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          stockNum <= 0
                            ? 'bg-red-100 text-red-600'
                            : stockNum <= 5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-cafe-100 text-cafe-600'
                        }`}
                      >
                        {stockNum <= 0 ? 'Stok Habis' : `Stok: ${stockNum}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(product)}
                      title={product.is_active ? 'Sembunyikan dari kasir' : 'Tampilkan di kasir'}
                      className="w-9 h-9 rounded-lg bg-cafe-50 text-cafe-500 hover:bg-cafe-100 flex items-center justify-center transition-colors"
                    >
                      {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      title="Edit menu"
                      className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      title="Hapus menu"
                      className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          existingCategories={categories.filter((c) => c !== 'Semua')}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          product={deleteTarget}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icon =
    category === 'Kopi' ? <Coffee className="w-6 h-6 text-cafe-500" />
    : category === 'Teh' ? <Leaf className="w-6 h-6 text-green-600" />
    : category === 'Makanan' ? <Utensils className="w-6 h-6 text-cafe-500" />
    : category === 'Rokok' ? <Cigarette className="w-6 h-6 text-cafe-500" />
    : <CupSoda className="w-6 h-6 text-cafe-500" />;
  return <span className="opacity-70">{icon}</span>;
}

const DEFAULT_CATEGORIES = ['Kopi', 'Teh', 'Makanan', 'Minuman', 'Rokok'];

function ProductFormModal({
  product,
  existingCategories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  existingCategories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = product !== null;
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Kopi');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock ?? 0) : '0');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [customCategory, setCustomCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(set);
  }, [existingCategories]);

  const priceNum = parseInt(price || '0', 10) || 0;
  const stockNum = parseInt(stock || '0', 10) || 0;

  const isValid =
    name.trim().length > 0 &&
    priceNum > 0 &&
    stockNum >= 0 &&
    (customCategory ? newCategory.trim().length > 0 : category.trim().length > 0);

  const handleSubmit = async () => {
    setError(null);
    if (!isValid) {
      setError('Nama, harga (min. Rp 1), stok (min. 0), dan kategori harus diisi.');
      return;
    }

    const finalCategory = customCategory ? newCategory.trim() : category;

    setSaving(true);
    const payload = {
      name: name.trim(),
      category: finalCategory,
      price: priceNum,
      stock: stockNum,
      image_url: imageUrl.trim() || null,
    };

    if (isEdit && product) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      if (error) {
        setError('Gagal menyimpan perubahan. Coba lagi.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('products').insert({ ...payload, is_active: true });
      if (error) {
        setError('Gagal menambah menu. Coba lagi.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-cream-50 flex items-center justify-between p-5 border-b border-cafe-100 z-10">
          <h3 className="font-display font-bold text-lg text-cafe-900">
            {isEdit ? 'Edit Menu & Stok' : 'Tambah Menu Baru'}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-cafe-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cafe-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Nama Menu</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kopi Tubruk"
              className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Kategori</label>
            {!customCategory ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        category === cat
                          ? 'bg-cafe-600 text-cream-50 shadow-sm'
                          : 'bg-white text-cafe-600 border border-cafe-200 hover:bg-cafe-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCustomCategory(true)}
                  className="mt-2 text-xs text-cafe-500 font-medium hover:text-cafe-700 transition-colors"
                >
                  + Buat kategori baru
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nama kategori baru"
                  className="flex-1 px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
                />
                <button
                  onClick={() => {
                    setCustomCategory(false);
                    setNewCategory('');
                  }}
                  className="px-3 py-3 bg-cafe-100 text-cafe-600 rounded-xl text-sm font-semibold hover:bg-cafe-200 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Harga (Rp)</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-base font-bold text-cafe-900 focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Jumlah Stok</label>
              <input
                type="number"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-base font-bold text-cafe-900 focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {priceNum > 0 && (
            <p className="text-xs text-cafe-400">
              Harga di kasir: <span className="font-semibold text-cafe-600">{formatRupiah(priceNum)}</span>
            </p>
          )}

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">
              URL Gambar <span className="text-cafe-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://contoh.com/gambar.jpg"
              className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
            <p className="text-xs text-cafe-400 mt-1.5">
              Kosongkan untuk menggunakan ikon otomatis sesuai kategori
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-white border border-cafe-200 text-cafe-600 rounded-xl font-semibold text-sm hover:bg-cafe-100 transition-colors active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !isValid}
              className="flex-1 py-3.5 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Menu'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  product,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  product: Product;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-cream-50 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-display font-bold text-lg text-cafe-900 mb-2">Hapus Menu?</h3>
          <p className="text-sm text-cafe-500">
            Yakin ingin menghapus <span className="font-semibold text-cafe-700">{product.name}</span>?
            Menu akan hilang dari daftar kasir. Riwayat transaksi yang sudah ada tidak terpengaruh.
          </p>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 bg-white border border-cafe-200 text-cafe-600 rounded-xl font-semibold text-sm hover:bg-cafe-100 transition-colors active:scale-95 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}