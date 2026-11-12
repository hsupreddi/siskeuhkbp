/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabase';
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
export async function fetchAllDataFromSupabase(): Promise<{ success: boolean; data?: SupabaseDataset; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
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
      supabase.from('kas').select('*').order('kode'),
      supabase.from('storage_accounts').select('*').order('nama'),
      supabase.from('categories').select('*').order('nama'),
      supabase.from('transactions').select('*').order('tanggal', { ascending: false }),
      supabase.from('opening_balances').select('*'),
      supabase.from('period_closings').select('*'),
      supabase.from('reconciliations').select('*'),
      supabase.from('audit_logs').select('*').order('changed_at', { ascending: false }).limit(250),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('user_kas_access').select('*'),
      supabase.from('budgets').select('*'),
      supabase.from('budget_items').select('*'),
      supabase.from('budget_reallocations').select('*'),
      supabase.from('opening_setup').select('*').limit(1),
      supabase.from('opening_balance_entries').select('*'),
      supabase.from('opening_balance_adjustments').select('*'),
      supabase.from('opening_other_positions').select('*'),
      supabase.from('prior_year_summaries').select('*'),
      supabase.from('fixed_assets').select('*'),
      supabase.from('advances').select('*'),
      supabase.from('advance_settlements').select('*'),
      supabase.from('receivables_payables').select('*'),
      supabase.from('lpj_notes').select('*').limit(1),
      supabase.from('lpj_settings').select('*').limit(1),
      supabase.from('audit_body_members').select('*'),
      supabase.from('audit_engagements').select('*'),
      supabase.from('audit_reviews').select('*'),
      supabase.from('audit_findings').select('*'),
      supabase.from('audit_final_opinions').select('*'),
      supabase.from('audit_period_verifications').select('*'),
      supabase.from('cash_counts').select('*'),
      supabase.from('semester_reports').select('*'),
      supabase.from('lpj_reports').select('*'),
      supabase.from('lpj_exceptions').select('*'),
      supabase.from('app_settings').select('*').limit(1),
    ]);

    const result: SupabaseDataset = {};

    if (kasRes.data && kasRes.data.length > 0) result.kasList = kasRes.data as Kas[];
    if (storageRes.data && storageRes.data.length > 0) result.storageAccounts = storageRes.data as StorageAccount[];
    if (catRes.data && catRes.data.length > 0) result.categories = catRes.data as Category[];
    if (txRes.data) result.transactions = txRes.data as Transaction[];
    if (obRes.data) result.openingBalances = obRes.data as OpeningBalance[];
    if (pcRes.data) result.periodClosings = pcRes.data as PeriodClosing[];
    if (recRes.data) result.reconciliations = recRes.data as Reconciliation[];
    if (logRes.data) result.auditLogs = logRes.data as AuditLog[];
    if (profRes.data && profRes.data.length > 0) result.profiles = profRes.data as Profile[];
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
    if (settingsRes.data && settingsRes.data.length > 0) result.settings = settingsRes.data[0] as AppSettings;

    return { success: true, data: result };
  } catch (err: any) {
    console.error('Failed to load dataset from Supabase:', err);
    return { success: false, error: err.message || 'Gagal mengambil data dari Supabase' };
  }
}

/**
 * Universal upsert helper for single record
 */
export async function syncUpsert(table: string, payload: any): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from(table).upsert(payload);
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
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from(table).insert(payload);
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
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from(table).update(payload).eq(matchCol, matchVal);
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
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from(table).delete().eq(matchCol, matchVal);
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
  if (!isSupabaseConfigured || !supabase) return { success: true };

  try {
    // 1. Delete transactions
    await supabase.from('transactions').delete().neq('id', '');
    // 2. Delete period closings & reconciliations
    await supabase.from('period_closings').delete().neq('id', '');
    await supabase.from('reconciliations').delete().neq('id', '');
    // 3. Delete advances & settlements
    await supabase.from('advance_settlements').delete().neq('id', '');
    await supabase.from('advances').delete().neq('id', '');
    // 4. Delete receivables / payables
    await supabase.from('receivables_payables').delete().neq('id', '');
    // 5. Delete audit findings, reviews, counts, verifications
    await supabase.from('audit_findings').delete().neq('id', '');
    await supabase.from('audit_reviews').delete().neq('id', '');
    await supabase.from('cash_counts').delete().neq('id', '');
    await supabase.from('audit_period_verifications').delete().neq('id', '');
    // 6. Reset opening balances to 0
    await supabase.from('opening_balances').update({ amount: 0 }).neq('id', '');
    await supabase.from('opening_balance_entries').update({ total_amount: 0, status: 'drafting' }).neq('id', '');
    // 7. Reset budgets and budget items to zero
    await supabase.from('budget_reallocations').delete().neq('id', '');
    await supabase.from('budget_items').delete().neq('id', '');
    await supabase.from('budgets').delete().neq('id', '');
    // 8. Delete fixed assets (aset tetap) and prior year summaries
    await supabase.from('fixed_assets').delete().neq('id', '');
    await supabase.from('prior_year_summaries').delete().neq('id', '');
    await supabase.from('opening_balance_adjustments').delete().neq('id', '');
    await supabase.from('opening_other_positions').delete().neq('id', '');

    return { success: true };
  } catch (err: any) {
    console.error('Supabase reset exception:', err);
    return { success: false, error: err.message };
  }
}
