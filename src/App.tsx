import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { POSPage, type CartItem } from '@/components/POSPage';
import { HistoryPage } from '@/components/HistoryPage';
import { DashboardPage } from '@/components/DashboardPage';
import { MenuManagementPage } from '@/components/MenuManagementPage';
import { SettingsPage } from '@/components/SettingsPage';
import { UserManagementPage } from '@/components/UserManagementPage';
import { LoginPage } from '@/components/LoginPage';
import { useAuth } from '@/lib/auth';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { fetchSettings, getDefaultSettings } from '@/lib/settings';
import type { AppSettings } from '@/lib/supabase';

export type Page = 'pos' | 'history' | 'dashboard' | 'menu' | 'settings' | 'users';

export default function App() {
  const { session, profile, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuRefreshKey, setMenuRefreshKey] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [settingsKey, setSettingsKey] = useState(0);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const online = useOnlineStatus();

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, [settingsKey]);

  // =========================================================================
  // PERBAIKAN POIN ACCESS GUARD:
  // Kasir HANYA bisa mengakses 'pos' dan 'history'.
  // Jika Kasir mencoba buka halaman lain (termasuk 'dashboard'), otomatis di-redirect ke 'pos'.
  // =========================================================================
  const canAccess = useCallback((p: Page): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return ['pos', 'history'].includes(p);
  }, [profile]);

  useEffect(() => {
    if (profile && !canAccess(page)) {
      setPage('pos');
    }
  }, [profile, page, canAccess]);

  const handleTransactionComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setMenuRefreshKey((k) => k + 1);
  }, []);

  const handleMenuChanged = useCallback(() => {
    setMenuRefreshKey((k) => k + 1);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSettingsChanged = useCallback(() => {
    setSettingsKey((k) => k + 1);
  }, []);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-900">
        <div className="w-10 h-10 border-3 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-900 p-4">
        <div className="bg-cream-50 rounded-2xl p-8 text-center max-w-sm">
          <h2 className="font-display font-bold text-xl text-cafe-900 mb-2">Akun Nonaktif</h2>
          <p className="text-sm text-cafe-500 mb-4">Akun Anda dinonaktifkan. Hubungi admin untuk mengaktifkan kembali.</p>
          <button
            onClick={signOut}
            className="px-5 py-2.5 bg-cafe-600 text-cream-50 rounded-xl font-semibold text-sm hover:bg-cafe-700"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentPage={page}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        cafeName={settings.cafe_name}
        logoUrl={settings.logo_url}
        online={online}
      />
      <main className="flex-1">
        {page === 'pos' && (
          <POSPage
            key={`pos-${menuRefreshKey}-${settingsKey}`}
            cart={cart}
            setCart={setCart}
            onTransactionComplete={handleTransactionComplete}
            settings={settings}
          />
        )}
        {page === 'history' && <HistoryPage refreshKey={refreshKey} />}
        
        {/* Proteksi halaman khusus Super Admin */}
        {page === 'dashboard' && profile.role === 'super_admin' && (
          <DashboardPage refreshKey={refreshKey} />
        )}
        {page === 'menu' && profile.role === 'super_admin' && (
          <MenuManagementPage
            refreshKey={menuRefreshKey}
            onMenuChanged={handleMenuChanged}
          />
        )}
        {page === 'users' && profile.role === 'super_admin' && (
          <UserManagementPage />
        )}
        {page === 'settings' && profile.role === 'super_admin' && (
          <SettingsPage onSettingsChanged={handleSettingsChanged} />
        )}
      </main>
    </div>
  );
}