import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
export const supabaseBaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');
const supabaseUrl = supabaseBaseUrl;
export const supabaseAnonOrPubKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  '';
const supabaseAnonKey = supabaseAnonOrPubKey;

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('YOUR_PROJECT_ID');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export async function uploadReceiptFile(
  file: File,
  periodId: string,
  operatorName: string
): Promise<{ publicUrl: string; filePath: string }> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${periodId}/${Date.now()}_${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah nota: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const { error: attError } = await supabase.from('attachments').insert({
    period_id: periodId,
    reference_table: 'expense_transactions',
    file_name: file.name,
    file_path: filePath,
    public_url: publicUrl,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    uploaded_by_operator: operatorName,
  });

  if (attError) {
    throw new Error(`Nota terunggah namun gagal mencatat metadata lampiran: ${attError.message}`);
  }

  return { publicUrl, filePath };
}
