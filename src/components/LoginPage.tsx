import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Coffee, Lock, Mail, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error === 'Invalid login credentials' ? 'Email atau password salah.' : error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cafe-900 via-cafe-800 to-cafe-700 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-cafe-500 rounded-2xl flex items-center justify-center shadow-xl mb-4">
            <Coffee className="w-8 h-8 text-cream-50" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-cream-50">Cafe Desa POS</h1>
          <p className="text-cafe-200 text-sm mt-1">Silakan masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cream-50 rounded-2xl shadow-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="iqbal@gmail.com"
                autoComplete="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cafe-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-cafe-400 hover:text-cafe-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-lg hover:bg-cafe-700 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

       
      </div>
    </div>
  );
}
