import { supabase, type AppSettings } from './supabase';

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  cafe_name: 'Cafe Desa',
  address: 'Jl. Desa Makmur No. 17',
  phone: '0812-3456-7890',
  logo_url: null,
  qr_code_url: null,
  updated_at: new Date().toISOString(),
};

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return getDefaultSettings();
  }
  return data as AppSettings;
}

export async function updateSettings(
  updates: Partial<Pick<AppSettings, 'cafe_name' | 'address' | 'phone' | 'logo_url' | 'qr_code_url'>>
): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .maybeSingle();

  if (error) return null;
  return data as AppSettings;
}

export async function uploadAsset(file: File, folder: 'logo' | 'qr-code'): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('cafe-assets')
    .upload(fileName, file, { upsert: true });

  if (error) return null;

  const { data: urlData } = supabase.storage
    .from('cafe-assets')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
