/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured, getSupabaseClient } from './supabase';
import {
  AppSettings,
  AuditLog,
  Budget,
  BudgetItem,
  BudgetReallocation,
  Category,
  Kas,
  OpeningBalance,
  OpeningSetup,
  OpeningBalanceEntry,
  OpeningBalanceAdjustment,
  OpeningOtherPosition,
  PriorYearSummary,
  PeriodClosing,
  Profile,
  Reconciliation,
  StorageAccount,
  Transaction,
  UserKasAccess,
  FixedAsset,
  Advance,
  AdvanceSettlement,
  ReceivablePayable,
  LpjNotes,
  LpjSettings,
  AuditBodyMember,
  AuditEngagement,
  AuditReview,
  AuditFinding,
  AuditFinalOpinion,
  CashCount,
  SemesterReport,
  LpjReport,
  LpjException,
  AuditPeriodVerification,
} from '../types/database';
import {
  DEMO_KAS,
  DEMO_STORAGE_ACCOUNTS,
  DEMO_CATEGORIES,
  DEMO_PROFILES,
  DEMO_SETTINGS,
  DEMO_OPENING_BALANCES,
  DEMO_OPENING_SETUP,
  DEMO_LPJ_SETTINGS,
  DEMO_LPJ_NOTES,
  DEMO_AUDIT_BODY_MEMBERS,
  DEMO_USER_KAS_ACCESS,
} from './demoData';

export interface SupabaseDataset {
  kasList?: Kas[];
  storageAccounts?: StorageAccount[];
  categories?: Category[];
  transactions?: Transaction[];
  openingBalances?: OpeningBalance[];
  periodClosings?: PeriodClosing[];
  reconciliations?: Reconciliation[];
  auditLogs?: AuditLog[];
  settings?: AppSettings;
  profiles?: Profile[];
  userKasAccessList?: UserKasAccess[];
  budgets?: Budget[];
  budgetItems?: BudgetItem[];
  budgetReallocations?: BudgetReallocation[];
  openingSetup?: OpeningSetup;
  openingEntries?: OpeningBalanceEntry[];
  openingAdjustments?: OpeningBalanceAdjustment[];
  openingOtherPositions?: OpeningOtherPosition[];
  priorYearSummaries?: PriorYearSummary[];
  fixedAssets?: FixedAsset[];
  advances?: Advance[];
  advanceSettlements?: AdvanceSettlement[];
  receivablesPayables?: ReceivablePayable[];
  lpjNotes?: LpjNotes;
  lpjSettings?: LpjSettings;
  auditBodyMembers?: AuditBodyMember[];
  auditEngagements?: AuditEngagement[];
  auditReviews?: AuditReview[];
  auditFindings?: AuditFinding[];
  auditFinalOpinions?: AuditFinalOpinion[];
  auditPeriodVerifications?: AuditPeriodVerification[];
  cashCounts?: CashCount[];
  semesterReports?: SemesterReport[];
  lpjReports?: LpjReport[];
  lpjExceptions?: LpjException[];
}

/**
 * Fetch all data from Supabase PostgreSQL tables
 */
export async function fetchAllDataFromSupabase(): Promise<{
  success: boolean;
  data?: SupabaseDataset;
  error?: string;
  tableErrors?: string[];
}> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) {
    return { success: false, error: 'Supabase belum dikonfigurasi.' };
  }

  try {
    const [
      kasRes,
      storageRes,
      catRes,
      txRes,
      obRes,
      pcRes,
      recRes,
      logRes,
      profRes,
      accessRes,
      bgRes,
      bgItemsRes,
      bgRealRes,
      setupRes,
      entriesRes,
      adjRes,
      otherRes,
      priorRes,
      assetsRes,
      advRes,
      advSetRes,
      recPayRes,
      lpjNotesRes,
      lpjSettingsRes,
      auditMembersRes,
      auditEngRes,
      auditReviewsRes,
      auditFindingsRes,
      auditOpinionsRes,
      auditVerifRes,
      cashCountsRes,
      semesterRes,
      lpjRes,
      exceptionsRes,
      settingsRes,
    ] = await Promise.all([
      client.from('kas').select('*').order('kode'),
      client.from('storage_accounts').select('*').order('nama'),
      client.from('categories').select('*').order('nama'),
      client.from('transactions').select('*').order('tanggal', { ascending: false }),
      client.from('opening_balances').select('*'),
      client.from('period_closings').select('*'),
      client.from('reconciliations').select('*'),
      client.from('audit_logs').select('*').order('changed_at', { ascending: false }).limit(250),
      client.from('profiles').select('*').order('full_name'),
      client.from('user_kas_access').select('*'),
      client.from('budgets').select('*'),
      client.from('budget_items').select('*'),
      client.from('budget_reallocations').select('*'),
      client.from('opening_setup').select('*').limit(1),
      client.from('opening_balance_entries').select('*'),
      client.from('opening_balance_adjustments').select('*'),
      client.from('opening_other_positions').select('*'),
      client.from('prior_year_summaries').select('*'),
      client.from('fixed_assets').select('*'),
      client.from('advances').select('*'),
      client.from('advance_settlements').select('*'),
      client.from('receivables_payables').select('*'),
      client.from('lpj_notes').select('*').limit(1),
      client.from('lpj_settings').select('*').limit(1),
      client.from('audit_body_members').select('*'),
      client.from('audit_engagements').select('*'),
      client.from('audit_reviews').select('*'),
      client.from('audit_findings').select('*'),
      client.from('audit_final_opinions').select('*'),
      client.from('audit_period_verifications').select('*'),
      client.from('cash_counts').select('*'),
      client.from('semester_reports').select('*'),
      client.from('lpj_reports').select('*'),
      client.from('lpj_exceptions').select('*'),
      client.from('app_settings').select('*').limit(1),
    ]);

    const tableErrors: string[] = [];
    if (kasRes.error) tableErrors.push(`kas: ${kasRes.error.message}`);
    if (txRes.error) tableErrors.push(`transactions: ${txRes.error.message}`);
    if (catRes.error) tableErrors.push(`categories: ${catRes.error.message}`);

    const result: SupabaseDataset = {};

    // Master Kas (with fallback to default HKBP kas if table is empty)
    if (kasRes.data && kasRes.data.length > 0) {
      result.kasList = kasRes.data as Kas[];
    } else if (kasRes.data && kasRes.data.length === 0) {
      result.kasList = DEMO_KAS;
    }

    // Storage Accounts
    if (storageRes.data && storageRes.data.length > 0) {
      result.storageAccounts = storageRes.data as StorageAccount[];
    } else if (storageRes.data && storageRes.data.length === 0) {
      result.storageAccounts = DEMO_STORAGE_ACCOUNTS;
    }

    // Categories
    if (catRes.data && catRes.data.length > 0) {
      result.categories = catRes.data as Category[];
    } else if (catRes.data && catRes.data.length === 0) {
      result.categories = DEMO_CATEGORIES;
    }

    // Profiles
    if (profRes.data && profRes.data.length > 0) {
      result.profiles = profRes.data as Profile[];
    } else if (profRes.data && profRes.data.length === 0) {
      result.profiles = DEMO_PROFILES;
    }

    // App Settings
    if (settingsRes.data && settingsRes.data.length > 0) {
      result.settings = settingsRes.data[0] as AppSettings;
    }

    // Transactions
    if (txRes.data) result.transactions = txRes.data as Transaction[];
    if (obRes.data) result.openingBalances = obRes.data as OpeningBalance[];
    if (pcRes.data) result.periodClosings = pcRes.data as PeriodClosing[];
    if (recRes.data) result.reconciliations = recRes.data as Reconciliation[];
    if (logRes.data) result.auditLogs = logRes.data as AuditLog[];
    if (accessRes.data) result.userKasAccessList = accessRes.data as UserKasAccess[];
    if (bgRes.data) result.budgets = bgRes.data as Budget[];
    if (bgItemsRes.data) result.budgetItems = bgItemsRes.data as BudgetItem[];
    if (bgRealRes.data) result.budgetReallocations = bgRealRes.data as BudgetReallocation[];
    if (setupRes.data && setupRes.data.length > 0) result.openingSetup = setupRes.data[0] as OpeningSetup;
    if (entriesRes.data) result.openingEntries = entriesRes.data as OpeningBalanceEntry[];
    if (adjRes.data) result.openingAdjustments = adjRes.data as OpeningBalanceAdjustment[];
    if (otherRes.data) result.openingOtherPositions = otherRes.data as OpeningOtherPosition[];
    if (priorRes.data) result.priorYearSummaries = priorRes.data as PriorYearSummary[];
    if (assetsRes.data) result.fixedAssets = assetsRes.data as FixedAsset[];
    if (advRes.data) result.advances = advRes.data as Advance[];
    if (advSetRes.data) result.advanceSettlements = advSetRes.data as AdvanceSettlement[];
    if (recPayRes.data) result.receivablesPayables = recPayRes.data as ReceivablePayable[];
    if (lpjNotesRes.data && lpjNotesRes.data.length > 0) result.lpjNotes = lpjNotesRes.data[0] as LpjNotes;
    if (lpjSettingsRes.data && lpjSettingsRes.data.length > 0) result.lpjSettings = lpjSettingsRes.data[0] as LpjSettings;
    if (auditMembersRes.data && auditMembersRes.data.length > 0) result.auditBodyMembers = auditMembersRes.data as AuditBodyMember[];
    if (auditEngRes.data) result.auditEngagements = auditEngRes.data as AuditEngagement[];
    if (auditReviewsRes.data) result.auditReviews = auditReviewsRes.data as AuditReview[];
    if (auditFindingsRes.data) result.auditFindings = auditFindingsRes.data as AuditFinding[];
    if (auditOpinionsRes.data) result.auditFinalOpinions = auditOpinionsRes.data as AuditFinalOpinion[];
    if (auditVerifRes.data) result.auditPeriodVerifications = auditVerifRes.data as AuditPeriodVerification[];
    if (cashCountsRes.data) result.cashCounts = cashCountsRes.data as CashCount[];
    if (semesterRes.data) result.semesterReports = semesterRes.data as SemesterReport[];
    if (lpjRes.data) result.lpjReports = lpjRes.data as LpjReport[];
    if (exceptionsRes.data) result.lpjExceptions = exceptionsRes.data as LpjException[];

    return { success: true, data: result, tableErrors };
  } catch (err: any) {
    console.error('[SIKU HKBP] Gagal memuat data dari Supabase:', err);
    return { success: false, error: err.message || 'Gagal mengambil data dari Supabase' };
  }
}

/**
 * Populate standard initial master data (HKBP chart of accounts, storage, profiles)
 * into a newly provisioned Supabase database.
 */
export async function seedMasterDataToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) {
    return { success: false, message: 'Supabase belum terkonfigurasi. Pastikan Project URL dan Anon Key sudah diisi.' };
  }

  try {
    const errors: string[] = [];

    // 1. App settings
    const { error: errSettings } = await client.from('app_settings').upsert(DEMO_SETTINGS);
    if (errSettings) errors.push(`app_settings: ${errSettings.message}`);

    // 2. Kas list
    const { error: errKas } = await client.from('kas').upsert(DEMO_KAS);
    if (errKas) errors.push(`kas: ${errKas.message}`);

    // 3. Storage accounts
    const { error: errStorage } = await client.from('storage_accounts').upsert(DEMO_STORAGE_ACCOUNTS);
    if (errStorage) errors.push(`storage_accounts: ${errStorage.message}`);

    // 4. Categories
    const { error: errCat } = await client.from('categories').upsert(DEMO_CATEGORIES);
    if (errCat) errors.push(`categories: ${errCat.message}`);

    // 5. Profiles
    const { error: errProf } = await client.from('profiles').upsert(DEMO_PROFILES);
    if (errProf) errors.push(`profiles: ${errProf.message}`);

    // 6. User Kas Access
    const { error: errAccess } = await client.from('user_kas_access').upsert(DEMO_USER_KAS_ACCESS);
    if (errAccess) errors.push(`user_kas_access: ${errAccess.message}`);

    // 7. Opening balances (default 0)
    const { error: errOb } = await client.from('opening_balances').upsert(DEMO_OPENING_BALANCES);
    if (errOb) errors.push(`opening_balances: ${errOb.message}`);

    // 8. Opening setup
    const { error: errSetup } = await client.from('opening_setup').upsert(DEMO_OPENING_SETUP);
    if (errSetup) errors.push(`opening_setup: ${errSetup.message}`);

    // 9. LPJ settings & notes
    const { error: errLpjSet } = await client.from('lpj_settings').upsert(DEMO_LPJ_SETTINGS);
    if (errLpjSet) errors.push(`lpj_settings: ${errLpjSet.message}`);

    const { error: errLpjNote } = await client.from('lpj_notes').upsert(DEMO_LPJ_NOTES);
    if (errLpjNote) errors.push(`lpj_notes: ${errLpjNote.message}`);

    // 10. Audit Body Members
    const { error: errAudit } = await client.from('audit_body_members').upsert(DEMO_AUDIT_BODY_MEMBERS);
    if (errAudit) errors.push(`audit_body_members: ${errAudit.message}`);

    if (errors.length > 0) {
      return {
        success: false,
        message: `Sebagian data master gagal diisi: ${errors.join('; ')}. Pastikan skrip SQL sudah dijalankan.`,
      };
    }

    return {
      success: true,
      message: 'Data master awal HKBP (Kas, Kategori PPKU, Akun Bank/Brankas, Profil, Pengaturan) berhasil disimpan ke Supabase!',
    };
  } catch (err: any) {
    console.error('Failed to seed master data to Supabase:', err);
    return { success: false, message: `Gagal mengisi data master: ${err.message}` };
  }
}

/**
 * Universal upsert helper for single record
 */
export async function syncUpsert(table: string, payload: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return { success: true };
  try {
    const { error } = await client.from(table).upsert(payload);
    if (error) {
      console.error(`Supabase syncUpsert error [${table}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Supabase syncUpsert exception [${table}]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Universal insert helper
 */
export async function syncInsert(table: string, payload: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return { success: true };
  try {
    const { error } = await client.from(table).insert(payload);
    if (error) {
      console.error(`Supabase syncInsert error [${table}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Supabase syncInsert exception [${table}]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Universal update helper
 */
export async function syncUpdate(
  table: string,
  payload: any,
  matchCol = 'id',
  matchVal: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return { success: true };
  try {
    const { error } = await client.from(table).update(payload).eq(matchCol, matchVal);
    if (error) {
      console.error(`Supabase syncUpdate error [${table}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Supabase syncUpdate exception [${table}]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Universal delete helper
 */
export async function syncDelete(
  table: string,
  matchCol = 'id',
  matchVal: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return { success: true };
  try {
    const { error } = await client.from(table).delete().eq(matchCol, matchVal);
    if (error) {
      console.error(`Supabase syncDelete error [${table}]:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Supabase syncDelete exception [${table}]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Clean reset in Supabase: removes all live transactions and balances
 */
export async function syncResetZeroDataInSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return { success: true };

  try {
    // 1. Delete transactions
    await client.from('transactions').delete().neq('id', '');
    // 2. Delete period closings & reconciliations
    await client.from('period_closings').delete().neq('id', '');
    await client.from('reconciliations').delete().neq('id', '');
    // 3. Delete advances & settlements
    await client.from('advance_settlements').delete().neq('id', '');
    await client.from('advances').delete().neq('id', '');
    // 4. Delete receivables / payables
    await client.from('receivables_payables').delete().neq('id', '');
    // 5. Delete audit findings, reviews, counts, verifications
    await client.from('audit_findings').delete().neq('id', '');
    await client.from('audit_reviews').delete().neq('id', '');
    await client.from('cash_counts').delete().neq('id', '');
    await client.from('audit_period_verifications').delete().neq('id', '');
    // 6. Reset opening balances to 0
    await client.from('opening_balances').update({ amount: 0 }).neq('id', '');
    await client.from('opening_balance_entries').update({ total_amount: 0, status: 'drafting' }).neq('id', '');
    // 7. Reset budgets and budget items to zero
    await client.from('budget_reallocations').delete().neq('id', '');
    await client.from('budget_items').delete().neq('id', '');
    await client.from('budgets').delete().neq('id', '');
    // 8. Delete fixed assets (aset tetap) and prior year summaries
    await client.from('fixed_assets').delete().neq('id', '');
    await client.from('prior_year_summaries').delete().neq('id', '');
    await client.from('opening_balance_adjustments').delete().neq('id', '');
    await client.from('opening_other_positions').delete().neq('id', '');

    return { success: true };
  } catch (err: any) {
    console.error('Supabase reset exception:', err);
    return { success: false, error: err.message };
  }
}
