import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';
import {
  UserPlus,
  Trash2,
  Pencil,
  Shield,
  User as UserIcon,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Ban,
  Power,
} from 'lucide-react';

type UserManagementPageProps = {
  onProfileChanged?: () => void;
};

export function UserManagementPage({ onProfileChanged }: UserManagementPageProps) {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`,
      {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Gagal memuat daftar user.');
      setLoading(false);
      return;
    }
    setUsers(json.profiles as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdd = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management?userId=${deleteTarget.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      }
    );
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || 'Gagal menghapus user.');
      return;
    }
    setDeleteTarget(null);
    fetchUsers();
  };

  const handleToggleActive = async (user: Profile) => {
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ userId: user.id, isActive: !user.is_active }),
      }
    );
    if (!res.ok) {
      setError('Gagal mengubah status user.');
      return;
    }
    fetchUsers();
    if (user.id === currentUser?.id) onProfileChanged?.();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Kelola User</h2>
          <p className="text-sm text-cafe-500">Tambah, edit, dan kelola hak akses kasir</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-3 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-md hover:bg-cafe-700 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Tambah User
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-cafe-100 text-cafe-600 flex items-center justify-center mb-2">
            <UserIcon className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Total User</p>
          <p className="font-display font-bold text-sm text-cafe-800">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <Shield className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Super Admin</p>
          <p className="font-display font-bold text-sm text-cafe-800">
            {users.filter((u) => u.role === 'super_admin').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cafe-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <UserIcon className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-cafe-400 font-medium mb-0.5">Kasir</p>
          <p className="font-display font-bold text-sm text-cafe-800">
            {users.filter((u) => u.role === 'kasir').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-cafe-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-cafe-600 text-sm mb-3">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700"
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((user) => (
            <div
              key={user.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md animate-fade-in ${
                user.is_active ? 'border-cafe-100' : 'border-cafe-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.role === 'super_admin'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {user.role === 'super_admin' ? <Shield className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-cafe-900 truncate">{user.display_name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.role === 'super_admin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role === 'super_admin' ? 'Super Admin' : 'Kasir'}
                    </span>
                    {!user.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cafe-400 mt-0.5 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(user)}
                    title={user.is_active ? 'Nonaktifkan user' : 'Aktifkan user'}
                    className="w-9 h-9 rounded-lg bg-cafe-50 text-cafe-500 hover:bg-cafe-100 flex items-center justify-center transition-colors"
                  >
                    {user.is_active ? <Power className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    title="Edit user"
                    className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => setDeleteTarget(user)}
                      title="Hapus user"
                      className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = user !== null;
  const { profile: currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'kasir');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = isEdit
    ? displayName.trim().length > 0
    : email.trim().length > 0 && password.length >= 6 && displayName.trim().length > 0;

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    try {
      if (isEdit && user) {
        const body: Record<string, unknown> = {
          userId: user.id,
          displayName: displayName.trim(),
          role,
        };
        if (password) body.password = password;

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Gagal menyimpan perubahan.');
          setSaving(false);
          return;
        }
        if (user.id === currentUser?.id) {
          // If editing self, just close — auth context will refresh
        }
      } else {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            role,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Gagal menambah user.');
          setSaving(false);
          return;
        }
      }
      setSaving(false);
      onSaved();
    } catch {
      setError('Terjadi kesalahan tak terduga.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-cream-50 flex items-center justify-between p-5 border-b border-cafe-100 z-10">
          <h3 className="font-display font-bold text-lg text-cafe-900">
            {isEdit ? 'Edit User' : 'Tambah User Baru'}
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
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Nama Tampilan</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Kasir 1"
              className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="text-sm font-semibold text-cafe-700 mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kasir@cafedesa.id"
                className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cafe-400" />
              {isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Minimal 6 karakter'}
              className="w-full px-4 py-3 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Role / Hak Akses</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('kasir')}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all ${
                  role === 'kasir'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Kasir</span>
                <span className="text-[10px] text-cafe-400">Kasir & Riwayat</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('super_admin')}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all ${
                  role === 'super_admin'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-cafe-200 bg-white text-cafe-400 hover:border-cafe-300'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="font-semibold text-sm">Super Admin</span>
                <span className="text-[10px] text-cafe-400">Akses Penuh</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> {isEdit ? 'Simpan' : 'Tambah'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteUserModal({
  user,
  onCancel,
  onConfirm,
}: {
  user: Profile;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cafe-950/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-cream-50 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Ban className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-display font-bold text-lg text-cafe-900 mb-2">Hapus User?</h3>
          <p className="text-sm text-cafe-500">
            Yakin ingin menghapus <span className="font-semibold text-cafe-700">{user.display_name}</span> ({user.email})?
            User tidak akan dapat login lagi.
          </p>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white border border-cafe-200 text-cafe-600 rounded-xl font-semibold text-sm hover:bg-cafe-100 transition-colors active:scale-95"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
