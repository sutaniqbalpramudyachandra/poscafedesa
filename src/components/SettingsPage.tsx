import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type AppSettings } from '@/lib/supabase';
import { fetchSettings, updateSettings, uploadAsset, getDefaultSettings } from '@/lib/settings';
import {
  Store,
  Image as ImageIcon,
  QrCode,
  Phone,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  Upload,
  Trash2,
  AlertCircle,
} from 'lucide-react';

type SettingsPageProps = {
  onSettingsChanged: () => void;
};

export function SettingsPage({ onSettingsChanged }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cafeName, setCafeName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'logo' | 'qr-code' | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await fetchSettings();
    setSettings(s);
    setCafeName(s.cafe_name);
    setAddress(s.address ?? '');
    setPhone(s.phone ?? '');
    setLogoUrl(s.logo_url);
    setQrCodeUrl(s.qr_code_url);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file: File, folder: 'logo' | 'qr-code') => {
    setUploadingField(folder);
    setError(null);
    const url = await uploadAsset(file, folder);
    if (!url) {
      setError(`Gagal mengunggah ${folder === 'logo' ? 'logo' : 'QR code'}. Coba lagi.`);
      setUploadingField(null);
      return;
    }
    if (folder === 'logo') setLogoUrl(url);
    else setQrCodeUrl(url);
    setUploadingField(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateSettings({
      cafe_name: cafeName.trim() || 'Cafe Desa',
      address: address.trim() || null,
      phone: phone.trim() || null,
      logo_url: logoUrl,
      qr_code_url: qrCodeUrl,
    });
    setSaving(false);
    if (!result) {
      setError('Gagal menyimpan pengaturan. Coba lagi.');
      return;
    }
    setSettings(result);
    setSaved(true);
    onSettingsChanged();
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-cafe-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-cafe-900 mb-1">Pengaturan</h2>
        <p className="text-sm text-cafe-500">Kelola identitas cafe, logo, dan QR code pembayaran</p>
      </div>

      {/* Cafe Profile */}
      <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cafe-100 flex items-center justify-center">
            <Store className="w-4.5 h-4.5 text-cafe-600" />
          </div>
          <h3 className="font-display font-bold text-cafe-900">Profil Cafe</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-cafe-400" />
              Nama Cafe
            </label>
            <input
              type="text"
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              placeholder="Cafe Desa"
              className="w-full px-4 py-3 bg-cream-50 border border-cafe-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
            <p className="text-xs text-cafe-400 mt-1.5">Nama ini tampil di header aplikasi dan struk pembayaran</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cafe-400" />
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Desa Makmur No. 17"
              rows={2}
              className="w-full px-4 py-3 bg-cream-50 border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-cafe-400" />
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812-3456-7890"
              className="w-full px-4 py-3 bg-cream-50 border border-cafe-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cafe-400 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cafe-100 flex items-center justify-center">
            <ImageIcon className="w-4.5 h-4.5 text-cafe-600" />
          </div>
          <h3 className="font-display font-bold text-cafe-900">Logo Cafe</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-cream-100 border border-cafe-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-cafe-300" />
            )}
          </div>
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, 'logo');
                e.target.value = '';
              }}
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingField === 'logo'}
                className="flex items-center gap-2 px-4 py-2.5 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700 transition-colors disabled:opacity-50 active:scale-95"
              >
                {uploadingField === 'logo' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Logo</>
                )}
              </button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              )}
            </div>
            <p className="text-xs text-cafe-400 mt-2">Logo tampil di struk pembayaran. Format: JPG/PNG, maksimal 1MB</p>
          </div>
        </div>
      </div>

      {/* QR Code Upload */}
      <div className="bg-white rounded-2xl border border-cafe-100 p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cafe-100 flex items-center justify-center">
            <QrCode className="w-4.5 h-4.5 text-cafe-600" />
          </div>
          <h3 className="font-display font-bold text-cafe-900">QR Code Pembayaran</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-cream-100 border border-cafe-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-cover" />
            ) : (
              <QrCode className="w-8 h-8 text-cafe-300" />
            )}
          </div>
          <div className="flex-1">
            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, 'qr-code');
                e.target.value = '';
              }}
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => qrInputRef.current?.click()}
                disabled={uploadingField === 'qr-code'}
                className="flex items-center gap-2 px-4 py-2.5 bg-cafe-600 text-cream-50 rounded-lg text-sm font-semibold hover:bg-cafe-700 transition-colors disabled:opacity-50 active:scale-95"
              >
                {uploadingField === 'qr-code' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload QR Code</>
                )}
              </button>
              {qrCodeUrl && (
                <button
                  onClick={() => setQrCodeUrl(null)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              )}
            </div>
            <p className="text-xs text-cafe-400 mt-2">QR code tampil di menu pembayaran QRIS. Format: JPG/PNG, maksimal 1MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Pengaturan berhasil disimpan
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-cafe-600 text-cream-50 rounded-xl font-display font-bold text-sm shadow-lg hover:bg-cafe-700 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
        ) : (
          <><Save className="w-5 h-5" /> Simpan Pengaturan</>
        )}
      </button>
    </div>
  );
}
