import { Coffee, ShoppingCart, BarChart3, Receipt, Menu as MenuIcon, X, BookOpen, Settings as SettingsIcon, Users, LogOut, Shield, User as UserIcon, WifiOff, RefreshCw, CloudUpload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSyncStatus } from '@/lib/useOnlineStatus';
import type { Page } from '@/App';

type NavbarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  cartCount: number;
  cafeName: string;
  logoUrl: string | null;
  online: boolean;
};

const ALL_NAV_ITEMS: { id: Page; label: string; icon: typeof Coffee; roles: ('super_admin' | 'kasir')[] }[] = [
  { id: 'pos', label: 'Kasir', icon: ShoppingCart, roles: ['super_admin', 'kasir'] },
  { id: 'history', label: 'Riwayat', icon: Receipt, roles: ['super_admin', 'kasir'] },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['super_admin', 'kasir'] },
  { id: 'menu', label: 'Menu', icon: BookOpen, roles: ['super_admin'] },
  { id: 'users', label: 'User', icon: Users, roles: ['super_admin'] },
  { id: 'settings', label: 'Setting', icon: SettingsIcon, roles: ['super_admin'] },
];

export function Navbar({ currentPage, onNavigate, cartCount, cafeName, logoUrl, online }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pendingCount, syncState, triggerSync } = useSyncStatus();

  const syncBadge = () => {
    if (!online) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-200 rounded-lg text-[11px] font-semibold">
          <WifiOff className="w-3 h-3" />
          Offline
        </span>
      );
    }
    if (syncState === 'syncing') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-[11px] font-semibold">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing
        </span>
      );
    }
    if (syncState === 'error' || syncState === 'partial') {
      return (
        <button
          onClick={triggerSync}
          className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-200 rounded-lg text-[11px] font-semibold hover:bg-amber-500/30 transition-colors"
          title={`${pendingCount} transaksi gagal sync. Klik untuk coba lagi.`}
        >
          <AlertTriangle className="w-3 h-3" />
          {pendingCount} Gagal
        </button>
      );
    }
    if (pendingCount > 0) {
      return (
        <button
          onClick={triggerSync}
          className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-200 rounded-lg text-[11px] font-semibold hover:bg-amber-500/30 transition-colors animate-pulse"
          title={`${pendingCount} transaksi menunggu sync`}
        >
          <CloudUpload className="w-3 h-3" />
          {pendingCount} Antri
        </button>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-200 rounded-lg text-[11px] font-semibold">
        <CheckCircle2 className="w-3 h-3" />
        Synced
      </span>
    );
  };

  const navItems = ALL_NAV_ITEMS.filter((item) =>
    profile && item.roles.includes(profile.role)
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-cafe-800 text-cream-50 shadow-lg shadow-cafe-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cafe-500 flex items-center justify-center shadow-md overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Coffee className="w-5.5 h-5.5 text-cream-50" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <h1 className="font-display font-extrabold text-lg leading-none tracking-tight">
                  {cafeName}
                </h1>
                <p className="text-[11px] text-cafe-200 leading-none mt-0.5">Sistem Kasir POS</p>
              </div>
              <div className="hidden sm:block ml-2">{syncBadge()}</div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? 'bg-cafe-500 text-cream-50 shadow-md'
                        : 'text-cafe-200 hover:bg-cafe-700 hover:text-cream-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.id === 'pos' && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-amber-400 text-cafe-900 text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-scale-in">
                        {cartCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-cafe-700">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${profile?.role === 'super_admin' ? 'bg-amber-400 text-cafe-900' : 'bg-blue-400 text-cafe-900'}`}>
                  {profile?.role === 'super_admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="text-right leading-none">
                  <p className="text-xs font-semibold text-cream-50">{profile?.display_name}</p>
                  <p className="text-[10px] text-cafe-300 mt-0.5">{profile?.role === 'super_admin' ? 'Super Admin' : 'Kasir'}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                title="Keluar"
                className="w-9 h-9 rounded-lg hover:bg-cafe-700 flex items-center justify-center transition-colors"
              >
                <LogOut className="w-4 h-4 text-cafe-200" />
              </button>
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-cafe-700 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-cafe-700 animate-slide-up">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-cafe-500 text-cream-50'
                      : 'text-cafe-200 hover:bg-cafe-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {item.id === 'pos' && cartCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1 bg-amber-400 text-cafe-900 text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="border-t border-cafe-700 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profile?.role === 'super_admin' ? 'bg-amber-400 text-cafe-900' : 'bg-blue-400 text-cafe-900'}`}>
                  {profile?.role === 'super_admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-cream-50">{profile?.display_name}</p>
                  <p className="text-[10px] text-cafe-300">{profile?.role === 'super_admin' ? 'Super Admin' : 'Kasir'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cafe-700 text-cafe-200 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </nav>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-cafe-800 border-t border-cafe-700 flex items-center justify-around pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center gap-1 py-2 px-1.5 transition-colors flex-1 ${
                active ? 'text-amber-400' : 'text-cafe-300'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {item.id === 'pos' && cartCount > 0 && (
                <span className="absolute top-0.5 right-2 min-w-[16px] h-4 px-1 bg-amber-400 text-cafe-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
