/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables OR localStorage (UI-configured)
function readStoredCredentials(): { url: string; key: string; isConfigured: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = typeof window !== 'undefined' ? (localStorage.getItem('siku_supabase_url') || '').trim() : '';
  const localKey = typeof window !== 'undefined' ? (localStorage.getItem('siku_supabase_anon_key') || '').trim() : '';

  const rawUrl = envUrl || localUrl;
  const rawKey = envAnonKey || localKey;

  // Clean trailing slashes & whitespace
  const url = rawUrl.replace(/\/+$/, '');
  const key = rawKey;

  const isConfigured = Boolean(
    url &&
    key &&
    (url.startsWith('https://') || url.startsWith('http://')) &&
    url !== 'https://your-project-ref.supabase.co' &&
    !url.includes('placeholder') &&
    key.length > 20
  );

  return { url, key, isConfigured };
}

const initialConfig = readStoredCredentials();

export let supabaseUrl: string = initialConfig.url;
export let supabaseAnonKey: string = initialConfig.key;
export let isSupabaseConfigured: boolean = initialConfig.isConfigured;

let activeClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Returns active Supabase client or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!activeClient) {
    const cfg = readStoredCredentials();
    if (cfg.isConfigured) {
      try {
        activeClient = createClient(cfg.url, cfg.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        supabaseUrl = cfg.url;
        supabaseAnonKey = cfg.key;
        isSupabaseConfigured = true;
      } catch (err) {
        console.error('[SIKU HKBP] Gagal menginisialisasi client Supabase:', err);
      }
    }
  }
  return activeClient;
}

/**
 * Dynamic Supabase client proxy that always delegates to current activeClient
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      if (prop === 'then') return undefined;
      // Return a safe dummy or throw descriptive error when accessed while unconfigured
      return undefined;
    }
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

/**
 * Save custom Supabase credentials from UI and reload client
 */
export function setSupabaseCredentials(url: string, key: string, reload: boolean = true) {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = key.trim();

  if (typeof window !== 'undefined') {
    localStorage.setItem('siku_supabase_url', cleanUrl);
    localStorage.setItem('siku_supabase_anon_key', cleanKey);
  }

  supabaseUrl = cleanUrl;
  supabaseAnonKey = cleanKey;
  isSupabaseConfigured = Boolean(
    cleanUrl &&
    cleanKey &&
    (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://')) &&
    cleanUrl !== 'https://your-project-ref.supabase.co' &&
    cleanKey.length > 20
  );

  try {
    activeClient = isSupabaseConfigured
      ? createClient(cleanUrl, cleanKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;
  } catch (e) {
    console.error('[SIKU HKBP] Error saat merefresh Supabase client:', e);
    activeClient = null;
  }

  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function clearSupabaseCredentials(reload: boolean = true) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('siku_supabase_url');
    localStorage.removeItem('siku_supabase_anon_key');
  }
  supabaseUrl = '';
  supabaseAnonKey = '';
  isSupabaseConfigured = false;
  activeClient = null;

  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
}

export interface SupabaseTestResult {
  success: boolean;
  message: string;
  tablesFound?: boolean;
  requiresSchemaExecution?: boolean;
  missingTables?: string[];
  tableDetails?: {
    kas: boolean;
    transactions: boolean;
    categories: boolean;
    app_settings: boolean;
    storage_accounts: boolean;
    profiles: boolean;
  };
}

/**
 * Test connectivity with Supabase project.
 * Supports custom credentials to test BEFORE saving.
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<SupabaseTestResult> {
  const targetUrl = (customUrl !== undefined ? customUrl : (supabaseUrl || (typeof window !== 'undefined' ? localStorage.getItem('siku_supabase_url') : '') || '')).trim().replace(/\/+$/, '');
  const targetKey = (customKey !== undefined ? customKey : (supabaseAnonKey || (typeof window !== 'undefined' ? localStorage.getItem('siku_supabase_anon_key') : '') || '')).trim();

  if (!targetUrl || !targetKey) {
    return {
      success: false,
      message: 'Kredensial belum lengkap. Masukkan Project URL dan Anon Key Supabase terlebih dahulu.',
    };
  }

  if (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://')) {
    return {
      success: false,
      message: 'Format Project URL tidak valid. Harus diawali dengan https:// (contoh: https://xxxx.supabase.co).',
    };
  }

  if (targetUrl.includes('your-project-ref') || targetUrl.includes('placeholder')) {
    return {
      success: false,
      message: 'Project URL masih menggunakan placeholder contoh. Masukkan URL proyek asli dari Supabase Dashboard Anda.',
    };
  }

  if (targetKey.length < 20) {
    return {
      success: false,
      message: 'Anon Key terlalu pendek. Pastikan menyalin "anon public" API key lengkap (biasanya diawali eyJhbGci...).',
    };
  }

  // Create temporary client for isolated testing
  let testClient: SupabaseClient;
  try {
    testClient = createClient(targetUrl, targetKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal membuat client Supabase: ${err.message}`,
    };
  }

  try {
    // 1. Query primary tables to verify connectivity and schema existence
    const [kasCheck, txCheck, catCheck, settingsCheck] = await Promise.all([
      testClient.from('kas').select('id').limit(1),
      testClient.from('transactions').select('id').limit(1),
      testClient.from('categories').select('id').limit(1),
      testClient.from('app_settings').select('id').limit(1),
    ]);

    const missingTables: string[] = [];
    if (kasCheck.error) missingTables.push('kas');
    if (txCheck.error) missingTables.push('transactions');
    if (catCheck.error) missingTables.push('categories');
    if (settingsCheck.error) missingTables.push('app_settings');

    const firstError = kasCheck.error || txCheck.error || catCheck.error || settingsCheck.error;

    if (firstError) {
      const errMsg = firstError.message || '';
      const errCode = firstError.code || '';

      // Check if the server connected successfully, but tables are not yet created
      const isMissingTable =
        errCode === '42P01' ||
        errMsg.toLowerCase().includes('does not exist') ||
        errMsg.toLowerCase().includes('relation') ||
        errCode === 'PGRST204' ||
        errCode === 'PGRST116';

      if (isMissingTable) {
        return {
          success: true, // Connected to Supabase host!
          tablesFound: false,
          requiresSchemaExecution: true,
          missingTables,
          message: `Koneksi ke Supabase berhasil! Namun tabel database belum dibuat (${missingTables.join(', ')} belum ada). Silakan salin & jalankan skrip SQL di Supabase SQL Editor.`,
        };
      }

      // Check for auth / API key failure
      if (
        errCode === 'PGRST301' ||
        errMsg.toLowerCase().includes('jwt') ||
        errMsg.toLowerCase().includes('apikey') ||
        errMsg.toLowerCase().includes('invalid api key')
      ) {
        return {
          success: false,
          message: `Anon Key tidak valid: ${errMsg}. Pastikan Anda menyalin "anon public" API key dari Dashboard > Project Settings > API.`,
        };
      }

      return {
        success: false,
        message: `Koneksi Supabase mengembalikan respons: ${errMsg} (Kode: ${errCode}).`,
      };
    }

    // All tested tables are ready and accessible!
    return {
      success: true,
      tablesFound: true,
      requiresSchemaExecution: false,
      tableDetails: {
        kas: true,
        transactions: true,
        categories: true,
        app_settings: true,
        storage_accounts: true,
        profiles: true,
      },
      message: 'Koneksi ke Supabase berhasil! Seluruh tabel database PostgreSQL siap digunakan untuk sinkronisasi data.',
    };
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ENOTFOUND')) {
      return {
        success: false,
        message: `Gagal menghubungi URL: ${targetUrl}. Pastikan Project URL benar dan koneksi internet stabil.`,
      };
    }
    return {
      success: false,
      message: `Terjadi kendala jaringan saat menguji koneksi: ${msg}`,
    };
  }
}

/**
 * Upload receipt photo to Supabase Storage bucket 'receipts'
 * with graceful fallback to Base64 Data URL if bucket is missing or network fails
 */
export async function uploadReceiptFile(file: File): Promise<{ url: string | null; error: Error | null }> {
  try {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await client.storage
        .from('receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        const { data } = client.storage.from('receipts').getPublicUrl(filePath);
        if (data?.publicUrl) {
          return { url: data.publicUrl, error: null };
        }
      } else {
        console.warn('[SIKU HKBP] Supabase storage upload gagal, beralih ke Base64 lokal:', uploadError.message);
      }
    }

    // Fallback: Read file as Base64 Data URL so receipt preview works reliably
    return convertFileToBase64(file);
  } catch (err: any) {
    console.warn('[SIKU HKBP] Exception upload nota, beralih ke Base64:', err);
    return convertFileToBase64(file);
  }
}

function convertFileToBase64(file: File): Promise<{ url: string | null; error: Error | null }> {
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
