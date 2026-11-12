/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables OR localStorage (UI-configured)
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('siku_supabase_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('siku_supabase_anon_key') : null;

export const supabaseUrl = envUrl || localUrl || '';
export const supabaseAnonKey = envAnonKey || localKey || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Save custom Supabase credentials from UI and reload client
 */
export function setSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('siku_supabase_url', url.trim());
    localStorage.setItem('siku_supabase_anon_key', key.trim());
    window.location.reload();
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('siku_supabase_url');
    localStorage.removeItem('siku_supabase_anon_key');
    window.location.reload();
  }
}

/**
 * Test connectivity with Supabase project
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Kredensial Supabase belum terkonfigurasi. Masukkan URL Proyek dan Anon Key terlebih dahulu.',
    };
  }

  try {
    const { data, error } = await supabase.from('kas').select('id, nama').limit(1);
    if (error) {
      return {
        success: false,
        message: `Koneksi gagal: ${error.message} (Kode: ${error.code}). Pastikan skrip SQL di supabase/schema_full.sql telah dijalankan.`,
      };
    }
    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Database PostgreSQL siap digunakan.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Terjadi kendala jaringan: ${err.message || 'Tidak dapat menghubungi server Supabase'}`,
    };
  }
}

/**
 * Upload receipt photo to Supabase Storage bucket 'receipts'
 * or fallback to local object URL if offline/demo
 */
export async function uploadReceiptFile(file: File): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (isSupabaseConfigured && supabase) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      return { url: data.publicUrl, error: null };
    } else {
      // In Demo Mode: Read file as Base64 Data URL so it previews reliably
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ url: reader.result as string, error: null });
        };
        reader.onerror = () => {
          resolve({ url: null, error: new Error('Gagal membaca file gambar nota.') });
        };
        reader.readAsDataURL(file);
      });
    }
  } catch (err: any) {
    return { url: null, error: err };
  }
}
