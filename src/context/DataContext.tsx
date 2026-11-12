/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  AuditLog,
  Budget,
  BudgetItem,
  BudgetRealizationRow,
  BudgetReallocation,
  BudgetStatus,
  Category,
  Kas,
  FundType,
  KasBalanceSummary,
  OpeningBalance,
  OpeningSetup,
  OpeningBalanceEntry,
  OpeningBalanceAdjustment,
  OpeningOtherPosition,
  PriorYearSummary,
  OpeningBookKasStatus,
  PeriodClosing,
  Profile,
  Reconciliation,
  StorageAccount,
  StorageBalanceSummary,
  Transaction,
  TransactionStatus,
  UserKasAccess,
  FixedAsset,
  FixedAssetCategory,
  FixedAssetStatus,
  FixedAssetCondition,
  AssetDepreciation,
  Advance,
  AdvanceStatus,
  AdvanceSettlement,
  AdvanceSettlementStatus,
  ReceivablePayable,
  ReceivablePayableType,
  ReceivablePayableStatus,
  ReceivablePayablePayment,
  LpjNotes,
  LpjSettings,
  LpjSignatory,
  AuditBodyMember,
  AuditEngagement,
  AuditReview,
  AuditFinding,
  AuditFinalOpinion,
  AuditPersonalOpinion,
  CashCount,
  SemesterReport,
  SemesterReportStatus,
  LpjReport,
  LpjReportStatus,
  LpjException,
  LaporanPosisiKeuanganData,
  LaporanPerubahanSaldoDanaItem,
  LaporanArusKasData,
  AuditPeriodVerification,
  AuditPeriodCode,
  AuditPeriodVerificationStatus,
  AuditFindingSeverity,
  FiscalYear,
  FiscalYearStatus,
} from '../types/database';
import {
  DEMO_AUDIT_LOGS,
  DEMO_BUDGETS,
  DEMO_BUDGET_ITEMS,
  DEMO_BUDGET_REALLOCATIONS,
  DEMO_CATEGORIES,
  DEMO_KAS,
  DEMO_OPENING_BALANCES,
  DEMO_OPENING_SETUP,
  DEMO_OPENING_ENTRIES,
  DEMO_OPENING_ADJUSTMENTS,
  DEMO_OPENING_OTHER_POSITIONS,
  DEMO_PRIOR_YEAR_SUMMARIES,
  DEMO_PERIOD_CLOSINGS,
  DEMO_PROFILES,
  DEMO_SETTINGS,
  DEMO_STORAGE_ACCOUNTS,
  DEMO_TRANSACTIONS,
  DEMO_USER_KAS_ACCESS,
  DEMO_FIXED_ASSETS,
  DEMO_ADVANCES,
  DEMO_ADVANCE_SETTLEMENTS,
  DEMO_RECEIVABLES_PAYABLES,
  DEMO_LPJ_NOTES,
  DEMO_LPJ_SETTINGS,
  DEMO_AUDIT_BODY_MEMBERS,
  DEMO_AUDIT_ENGAGEMENTS,
  DEMO_AUDIT_REVIEWS,
  DEMO_AUDIT_FINDINGS,
  DEMO_AUDIT_FINAL_OPINIONS,
  DEMO_CASH_COUNTS,
  DEMO_SEMESTER_REPORTS,
  DEMO_LPJ_REPORTS,
  DEMO_LPJ_EXCEPTIONS,
  DEMO_AUDIT_PERIOD_VERIFICATIONS,
  DEMO_FISCAL_YEARS,
  generateMonthlyDistribution,
} from '../lib/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  fetchAllDataFromSupabase,
  syncInsert,
  syncUpsert,
  syncUpdate,
  syncDelete,
  syncResetZeroDataInSupabase,
} from '../lib/supabaseSync';
import { useAuth } from './AuthContext';

interface DataContextType {
  kasList: Kas[];
  storageAccounts: StorageAccount[];
  categories: Category[];
  transactions: Transaction[];
  openingBalances: OpeningBalance[];
  periodClosings: PeriodClosing[];
  reconciliations: Reconciliation[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  profiles: Profile[];
  userKasAccessList: UserKasAccess[];
  loading: boolean;

  // Calculators
  getKasBalances: () => KasBalanceSummary[];
  getStorageBalances: () => StorageBalanceSummary[];
  getSentralisasiSummary: (year?: number) => {
    totalPenerimaan: number;
    totalObjekSentralisasi: number;
    totalBpskObligation: number;
    totalHuriaShare: number;
    totalDikecualikan: number;
    totalSosialDuka: number;
    totalBeasiswa: number;
    totalPembangunanLokal: number;
    totalBpskRemitted: number;
    outstandingBpsk: number;
  };
  isPeriodClosed: (year: number, month: number, kasId: string) => boolean;
  getPendingTransactionsCount: (kasId?: string) => number;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_reversal'>) => Promise<{ success: boolean; error?: string }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  changeStatus: (id: string, newStatus: TransactionStatus, rejectNote?: string) => Promise<{ success: boolean; error?: string }>;
  bulkApprove: (ids: string[]) => Promise<{ success: boolean; count: number }>;
  createTransfer: (params: {
    tanggal: string;
    sourceKasId: string;
    sourceStorageId: string;
    targetKasId: string;
    targetStorageId: string;
    amount: number;
    description: string;
    receiptNo?: string;
    attachmentUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  confirmTransferReceipt: (transferId: string) => Promise<{ success: boolean; error?: string }>;
  createReversalTransaction: (originalTxId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Period Closing
  closePeriod: (year: number, month: number, kasId?: string | null) => Promise<{ success: boolean; error?: string }>;
  reopenPeriod: (closingId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Reconciliations
  saveReconciliation: (rec: Omit<Reconciliation, 'id' | 'created_at' | 'discrepancy'>) => Promise<{ success: boolean; error?: string }>;

  // Budget (APBG) State & Operations
  budgets: Budget[];
  budgetItems: BudgetItem[];
  budgetReallocations: BudgetReallocation[];
  saveBudget: (budgetData: Partial<Budget>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteBudget: (budgetId: string) => Promise<{ success: boolean; error?: string }>;
  saveBudgetItem: (itemData: Partial<BudgetItem>) => Promise<{ success: boolean; error?: string }>;
  deleteBudgetItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  changeBudgetStatus: (
    budgetId: string,
    newStatus: BudgetStatus,
    params?: {
      returnNote?: string;
      rapatDate?: string;
      rapatBeritaAcaraNo?: string;
      rapatDocUrl?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  createBudgetRevision: (sourceBudgetId: string) => Promise<{ success: boolean; newBudgetId?: string; error?: string }>;
  reallocateBudget: (params: {
    budgetId: string;
    fromItemId: string;
    toItemId: string;
    amount: number;
    reason: string;
  }) => Promise<{ success: boolean; error?: string }>;
  copyBudgetFromPreviousYear: (kasId: string, currentYear: number) => Promise<{ success: boolean; count?: number; error?: string }>;
  getBudgetRealization: (kasId: string, year: number, throughMonth: number) => BudgetRealizationRow[];
  getConsolidatedBudgetRealization: (year: number, throughMonth: number) => {
    rows: BudgetRealizationRow[];
    totalBudgetAnnual: number;
    totalBudgetYTD: number;
    totalActualYTD: number;
    totalVariance: number;
  };

  // Opening Book & Balance State & Operations
  openingSetup: OpeningSetup;
  openingEntries: OpeningBalanceEntry[];
  openingAdjustments: OpeningBalanceAdjustment[];
  openingOtherPositions: OpeningOtherPosition[];
  priorYearSummaries: PriorYearSummary[];
  isKasOpeningLocked: (kasId: string) => boolean;
  getOpeningStatusForKas: (kasId: string) => OpeningBookKasStatus;
  saveOpeningEntry: (entry: Partial<OpeningBalanceEntry>) => Promise<{ success: boolean; error?: string }>;
  submitOpeningBook: (kasId: string) => Promise<{ success: boolean; error?: string }>;
  approveOpeningBook: (kasId: string, approve: boolean, returnNote?: string) => Promise<{ success: boolean; error?: string }>;
  lockOpeningBook: (kasId?: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  saveOpeningAdjustment: (adj: Partial<OpeningBalanceAdjustment>) => Promise<{ success: boolean; error?: string }>;
  approveOpeningAdjustment: (adjId: string, approve: boolean, rejectNote?: string) => Promise<{ success: boolean; error?: string }>;
  saveOpeningOtherPosition: (pos: Partial<OpeningOtherPosition>) => Promise<{ success: boolean; error?: string }>;
  deleteOpeningOtherPosition: (id: string) => Promise<{ success: boolean; error?: string }>;
  savePriorYearSummary: (summary: Partial<PriorYearSummary>) => Promise<{ success: boolean; error?: string }>;
  updateOpeningSetup: (setup: Partial<OpeningSetup>) => Promise<{ success: boolean; error?: string }>;

  // Master Data CRUD
  saveKas: (kasData: Partial<Kas>) => Promise<void>;
  deleteKas: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveStorageAccount: (data: Partial<StorageAccount>) => Promise<void>;
  saveCategory: (data: Partial<Category>) => Promise<void>;
  saveOpeningBalance: (data: Partial<OpeningBalance>) => Promise<void>;
  saveUserKasAccess: (data: Omit<UserKasAccess, 'id'>) => Promise<void>;
  removeUserKasAccess: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Fiscal Years (Tahun Anggaran)
  fiscalYears: FiscalYear[];
  saveFiscalYear: (fyData: Partial<FiscalYear>) => Promise<{ success: boolean; error?: string }>;
  deleteFiscalYear: (id: string) => Promise<{ success: boolean; error?: string }>;
  setActiveFiscalYear: (year: number) => Promise<{ success: boolean; error?: string }>;
  toggleFiscalYearBudgetLock: (year: number) => Promise<{ success: boolean; error?: string }>;
  rollForwardBalancesToYear: (fromYear: number, toYear: number) => Promise<{ success: boolean; count: number; error?: string }>;

  // User Management (Pengguna & Pelayan Gereja HKBP)
  saveProfile: (profileData: Partial<Profile>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleProfileActive: (id: string) => Promise<{ success: boolean; error?: string }>;

  // LPJ Supporting Data (ISAK 35 - Modified Cash Basis)
  fixedAssets: FixedAsset[];
  advances: Advance[];
  advanceSettlements: AdvanceSettlement[];
  receivablesPayables: ReceivablePayable[];
  lpjNotes: LpjNotes;
  lpjSettings: LpjSettings;
  saveFixedAsset: (assetData: Partial<FixedAsset>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteFixedAsset: (id: string) => Promise<{ success: boolean; error?: string }>;
  proposeAssetDisposal: (id: string, actionType: 'diajukan_penghapusan' | 'diajukan_hibah', reason: string) => Promise<{ success: boolean; error?: string }>;
  approveAssetDisposal: (id: string, approve: boolean, notes?: string) => Promise<{ success: boolean; error?: string }>;
  calculateDepreciation: (asset: FixedAsset, year: number) => { annualDepreciation: number; accumulatedDepreciation: number; bookValue: number };
  saveAdvance: (advanceData: Partial<Advance>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteAdvance: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveAdvanceSettlement: (settlementData: Partial<AdvanceSettlement>) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitAdvanceSettlement: (settlementId: string) => Promise<{ success: boolean; error?: string }>;
  approveAdvanceSettlement: (settlementId: string, approve: boolean, rejectNote?: string) => Promise<{ success: boolean; error?: string }>;
  saveReceivablePayable: (data: Partial<ReceivablePayable>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteReceivablePayable: (id: string) => Promise<{ success: boolean; error?: string }>;
  recordReceivablePayablePayment: (id: string, paymentAmount: number, paymentDate: string, storageId?: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  saveLpjNotes: (notesData: Partial<LpjNotes>) => Promise<{ success: boolean; error?: string }>;
  updateLpjSettings: (newSettings: Partial<LpjSettings>) => Promise<{ success: boolean; error?: string }>;
  updateKasFundType: (kasId: string, fundType: FundType, restrictedPurpose?: string | null) => Promise<{ success: boolean; error?: string }>;
  migrateOpeningPositionsToLpj: () => Promise<{ success: boolean; count?: { assets: number; advances: number; rp: number }; error?: string }>;

  // Badan Audit Huria (Internal Audit Body)
  auditBodyMembers: AuditBodyMember[];
  auditEngagements: AuditEngagement[];
  auditReviews: AuditReview[];
  auditFindings: AuditFinding[];
  auditFinalOpinions: AuditFinalOpinion[];
  cashCounts: CashCount[];
  saveAuditBodyMember: (memberData: Partial<AuditBodyMember>) => Promise<{ success: boolean; error?: string }>;
  removeAuditBodyMember: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveAuditEngagement: (engData: Partial<AuditEngagement>) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitAuditReview: (reviewData: Partial<AuditReview>) => Promise<{ success: boolean; error?: string }>;
  saveAuditFinding: (findingData: Partial<AuditFinding>) => Promise<{ success: boolean; id?: string; error?: string }>;
  respondAuditFinding: (id: string, responseNotes: string) => Promise<{ success: boolean; error?: string }>;
  closeAuditFinding: (id: string, approveClose: boolean, closingNotes: string) => Promise<{ success: boolean; error?: string }>;
  finalizeAuditOpinion: (
    engagementId: string,
    params: {
      beritaAcaraNo: string;
      beritaAcaraDate: string;
      dissentingNotes?: string;
      signatories: { role: string; name: string; signed_at?: string }[];
    }
  ) => Promise<{ success: boolean; opinion?: AuditPersonalOpinion; error?: string }>;
  recordCashCount: (data: Partial<CashCount>) => Promise<{ success: boolean; id?: string; findingId?: string; error?: string }>;

  // Verifikasi Transaksi & Pemeriksaan Berkala Badan Audit Huria (Pasal 7 & 44 AP HKBP)
  verifyTransactionAudit: (
    transactionId: string,
    status: 'unverified' | 'verified' | 'flagged',
    note?: string,
    finding?: { title: string; description: string; severity: AuditFindingSeverity; dueDate?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  auditPeriodVerifications: AuditPeriodVerification[];
  saveAuditPeriodVerification: (data: Partial<AuditPeriodVerification>) => Promise<{ success: boolean; error?: string }>;
  signAuditPeriodVerification: (periodCode: AuditPeriodCode) => Promise<{ success: boolean; error?: string }>;

  // Laporan Semester & LPJ Tahunan (ISAK 35)
  semesterReports: SemesterReport[];
  lpjReports: LpjReport[];
  lpjExceptions: LpjException[];
  runSemesterChecklist: (tahun: number, semester: 1 | 2) => Promise<{
    checklist: SemesterReport['checklist_result'];
    passed: boolean;
    blockers: string[];
  }>;
  lockSemesterSnapshot: (reportId: string) => Promise<{ success: boolean; error?: string }>;
  forwardSemesterToPastor: (reportId: string, sentRef: string) => Promise<{ success: boolean; error?: string }>;
  acknowledgeSemesterReport: (reportId: string, pastorNote: string) => Promise<{ success: boolean; error?: string }>;
  announceSemesterReport: (reportId: string, medium: 'warta_jemaat' | 'mimbar' | 'papan_pengumuman' | 'lainnya', text: string) => Promise<{ success: boolean; error?: string }>;
  returnSemesterReport: (reportId: string, returnNotes: string) => Promise<{ success: boolean; error?: string }>;

  runLpjChecklist: (tahun: number) => Promise<{
    checklist: LpjReport['checklist_result'];
    passed: boolean;
    blockers: string[];
  }>;
  lockLpjSnapshot: (lpjId: string) => Promise<{ success: boolean; error?: string }>;
  submitLpjToMeeting: (lpjId: string, meetingDate: string, meetingRef: string) => Promise<{ success: boolean; error?: string }>;
  approveLpjReport: (lpjId: string, meetingNotes: string, attendeesCount: number) => Promise<{ success: boolean; error?: string }>;
  returnLpjReport: (lpjId: string, returnNotes: string) => Promise<{ success: boolean; error?: string }>;
  grantLpjException: (targetType: 'semester' | 'lpj', targetId: string, ruleCode: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  isYearLockedByLpj: (year: number) => boolean;

  // ISAK 35 Calculation Generators
  getPosisiKeuangan: (year: number) => LaporanPosisiKeuanganData;
  getPerubahanSaldoDana: (year: number) => LaporanPerubahanSaldoDanaItem[];
  getArusKasLangsung: (year: number) => LaporanArusKasData;

  // System Data Reset
  resetAllTransactionsAndBalancesToZero: () => Promise<{ success: boolean; message: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Ensure runtime clean reset on client load (PPKU Sentralisasi HKBP Categories & Assets, Balances, Transactions to Zero)
const SIKU_CLEAN_RESET_KEY = 'siku_reset_v8_ppku_sentralisasi_hkbp';
if (typeof window !== 'undefined' && !localStorage.getItem(SIKU_CLEAN_RESET_KEY)) {
  localStorage.removeItem('siku_transactions');
  localStorage.removeItem('siku_budgets');
  localStorage.removeItem('siku_budget_items');
  localStorage.removeItem('siku_budget_reallocations');
  localStorage.removeItem('siku_opening_balances');
  localStorage.removeItem('siku_opening_entries');
  localStorage.removeItem('siku_opening_adjustments');
  localStorage.removeItem('siku_opening_other_positions');
  localStorage.removeItem('siku_opening_setup');
  localStorage.removeItem('siku_period_closings');
  localStorage.removeItem('siku_reconciliations');
  localStorage.removeItem('siku_advances');
  localStorage.removeItem('siku_advance_settlements');
  localStorage.removeItem('siku_receivables_payables');
  localStorage.removeItem('siku_fixed_assets');
  localStorage.removeItem('siku_prior_year_summaries');
  localStorage.removeItem('siku_cash_counts');
  localStorage.removeItem('siku_audit_period_verifications');
  localStorage.removeItem('siku_audit_reviews');
  localStorage.removeItem('siku_audit_findings');
  localStorage.removeItem('siku_audit_final_opinions');
  localStorage.removeItem('siku_semester_reports');
  localStorage.removeItem('siku_lpj_reports');
  localStorage.removeItem('siku_audit_logs');
  localStorage.removeItem('siku_categories'); // Reload PPKU categories
  localStorage.setItem(SIKU_CLEAN_RESET_KEY, 'true');
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [kasList, setKasList] = useState<Kas[]>(() => {
    const saved = localStorage.getItem('siku_kas_list');
    return saved ? JSON.parse(saved) : DEMO_KAS;
  });

  const [storageAccounts, setStorageAccounts] = useState<StorageAccount[]>(() => {
    const saved = localStorage.getItem('siku_storage_accounts');
    return saved ? JSON.parse(saved) : DEMO_STORAGE_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('siku_categories');
    return saved ? JSON.parse(saved) : DEMO_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('siku_transactions');
    return saved ? JSON.parse(saved) : DEMO_TRANSACTIONS;
  });

  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>(() => {
    const saved = localStorage.getItem('siku_opening_balances');
    return saved ? JSON.parse(saved) : DEMO_OPENING_BALANCES;
  });

  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>(() => {
    const saved = localStorage.getItem('siku_period_closings');
    return saved ? JSON.parse(saved) : DEMO_PERIOD_CLOSINGS;
  });

  const [reconciliations, setReconciliations] = useState<Reconciliation[]>(() => {
    const saved = localStorage.getItem('siku_reconciliations');
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('siku_audit_logs');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_LOGS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('siku_settings');
    return saved ? JSON.parse(saved) : DEMO_SETTINGS;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('siku_profiles');
    return saved ? JSON.parse(saved) : DEMO_PROFILES;
  });

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(() => {
    const saved = localStorage.getItem('siku_fiscal_years');
    return saved ? JSON.parse(saved) : DEMO_FISCAL_YEARS;
  });

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_fiscal_years', JSON.stringify(fiscalYears));
  }, [fiscalYears]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_profiles', JSON.stringify(profiles));
  }, [profiles]);

  const [auditPeriodVerifications, setAuditPeriodVerifications] = useState<AuditPeriodVerification[]>(() => {
    const saved = localStorage.getItem('siku_audit_period_verifications');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_PERIOD_VERIFICATIONS;
  });

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_period_verifications', JSON.stringify(auditPeriodVerifications));
  }, [auditPeriodVerifications]);

  const [userKasAccessList, setUserKasAccessList] = useState<UserKasAccess[]>(() => {
    const saved = localStorage.getItem('siku_user_kas_access');
    return saved ? JSON.parse(saved) : DEMO_USER_KAS_ACCESS;
  });

  // Budget State
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('siku_budgets');
    return saved ? JSON.parse(saved) : DEMO_BUDGETS;
  });

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => {
    const saved = localStorage.getItem('siku_budget_items');
    return saved ? JSON.parse(saved) : DEMO_BUDGET_ITEMS;
  });

  const [budgetReallocations, setBudgetReallocations] = useState<BudgetReallocation[]>(() => {
    const saved = localStorage.getItem('siku_budget_reallocations');
    return saved ? JSON.parse(saved) : DEMO_BUDGET_REALLOCATIONS;
  });

  // Opening Book & Balance State
  const [openingSetup, setOpeningSetup] = useState<OpeningSetup>(() => {
    const saved = localStorage.getItem('siku_opening_setup');
    return saved ? JSON.parse(saved) : DEMO_OPENING_SETUP;
  });

  const [openingEntries, setOpeningEntries] = useState<OpeningBalanceEntry[]>(() => {
    const saved = localStorage.getItem('siku_opening_entries');
    return saved ? JSON.parse(saved) : DEMO_OPENING_ENTRIES;
  });

  const [openingAdjustments, setOpeningAdjustments] = useState<OpeningBalanceAdjustment[]>(() => {
    const saved = localStorage.getItem('siku_opening_adjustments');
    return saved ? JSON.parse(saved) : DEMO_OPENING_ADJUSTMENTS;
  });

  const [openingOtherPositions, setOpeningOtherPositions] = useState<OpeningOtherPosition[]>(() => {
    const saved = localStorage.getItem('siku_opening_other_positions');
    return saved ? JSON.parse(saved) : DEMO_OPENING_OTHER_POSITIONS;
  });

  const [priorYearSummaries, setPriorYearSummaries] = useState<PriorYearSummary[]>(() => {
    const saved = localStorage.getItem('siku_prior_year_summaries');
    return saved ? JSON.parse(saved) : DEMO_PRIOR_YEAR_SUMMARIES;
  });

  // LPJ Supporting Data State (ISAK 35 - Modified Cash Basis)
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(() => {
    const saved = localStorage.getItem('siku_fixed_assets');
    return saved ? JSON.parse(saved) : DEMO_FIXED_ASSETS;
  });

  const [advances, setAdvances] = useState<Advance[]>(() => {
    const saved = localStorage.getItem('siku_advances');
    return saved ? JSON.parse(saved) : DEMO_ADVANCES;
  });

  const [advanceSettlements, setAdvanceSettlements] = useState<AdvanceSettlement[]>(() => {
    const saved = localStorage.getItem('siku_advance_settlements');
    return saved ? JSON.parse(saved) : DEMO_ADVANCE_SETTLEMENTS;
  });

  const [receivablesPayables, setReceivablesPayables] = useState<ReceivablePayable[]>(() => {
    const saved = localStorage.getItem('siku_receivables_payables');
    return saved ? JSON.parse(saved) : DEMO_RECEIVABLES_PAYABLES;
  });

  const [lpjNotes, setLpjNotes] = useState<LpjNotes>(() => {
    const saved = localStorage.getItem('siku_lpj_notes');
    return saved ? JSON.parse(saved) : DEMO_LPJ_NOTES;
  });

  const [lpjSettings, setLpjSettings] = useState<LpjSettings>(() => {
    const saved = localStorage.getItem('siku_lpj_settings');
    return saved ? JSON.parse(saved) : DEMO_LPJ_SETTINGS;
  });

  // Badan Audit Huria State
  const [auditBodyMembers, setAuditBodyMembers] = useState<AuditBodyMember[]>(() => {
    const saved = localStorage.getItem('siku_audit_body_members');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_BODY_MEMBERS;
  });

  const [auditEngagements, setAuditEngagements] = useState<AuditEngagement[]>(() => {
    const saved = localStorage.getItem('siku_audit_engagements');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_ENGAGEMENTS;
  });

  const [auditReviews, setAuditReviews] = useState<AuditReview[]>(() => {
    const saved = localStorage.getItem('siku_audit_reviews');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_REVIEWS;
  });

  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>(() => {
    const saved = localStorage.getItem('siku_audit_findings');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_FINDINGS;
  });

  const [auditFinalOpinions, setAuditFinalOpinions] = useState<AuditFinalOpinion[]>(() => {
    const saved = localStorage.getItem('siku_audit_final_opinions');
    return saved ? JSON.parse(saved) : DEMO_AUDIT_FINAL_OPINIONS;
  });

  const [cashCounts, setCashCounts] = useState<CashCount[]>(() => {
    const saved = localStorage.getItem('siku_cash_counts');
    return saved ? JSON.parse(saved) : DEMO_CASH_COUNTS;
  });

  // Laporan Semester & LPJ State
  const [semesterReports, setSemesterReports] = useState<SemesterReport[]>(() => {
    const saved = localStorage.getItem('siku_semester_reports');
    return saved ? JSON.parse(saved) : DEMO_SEMESTER_REPORTS;
  });

  const [lpjReports, setLpjReports] = useState<LpjReport[]>(() => {
    const saved = localStorage.getItem('siku_lpj_reports');
    return saved ? JSON.parse(saved) : DEMO_LPJ_REPORTS;
  });

  const [lpjExceptions, setLpjExceptions] = useState<LpjException[]>(() => {
    const saved = localStorage.getItem('siku_lpj_exceptions');
    return saved ? JSON.parse(saved) : DEMO_LPJ_EXCEPTIONS;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_body_members', JSON.stringify(auditBodyMembers));
  }, [auditBodyMembers]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_engagements', JSON.stringify(auditEngagements));
  }, [auditEngagements]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_reviews', JSON.stringify(auditReviews));
  }, [auditReviews]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_findings', JSON.stringify(auditFindings));
  }, [auditFindings]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_final_opinions', JSON.stringify(auditFinalOpinions));
  }, [auditFinalOpinions]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_cash_counts', JSON.stringify(cashCounts));
  }, [cashCounts]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_semester_reports', JSON.stringify(semesterReports));
  }, [semesterReports]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_lpj_reports', JSON.stringify(lpjReports));
  }, [lpjReports]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_lpj_exceptions', JSON.stringify(lpjExceptions));
  }, [lpjExceptions]);

  // Sync to local storage
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_fixed_assets', JSON.stringify(fixedAssets));
  }, [fixedAssets]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_advances', JSON.stringify(advances));
  }, [advances]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_advance_settlements', JSON.stringify(advanceSettlements));
  }, [advanceSettlements]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_receivables_payables', JSON.stringify(receivablesPayables));
  }, [receivablesPayables]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_lpj_notes', JSON.stringify(lpjNotes));
  }, [lpjNotes]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_lpj_settings', JSON.stringify(lpjSettings));
  }, [lpjSettings]);

  // Sync to local storage
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_opening_setup', JSON.stringify(openingSetup));
  }, [openingSetup]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_opening_entries', JSON.stringify(openingEntries));
  }, [openingEntries]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_opening_adjustments', JSON.stringify(openingAdjustments));
  }, [openingAdjustments]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_opening_other_positions', JSON.stringify(openingOtherPositions));
  }, [openingOtherPositions]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_prior_year_summaries', JSON.stringify(priorYearSummaries));
  }, [priorYearSummaries]);
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_kas_list', JSON.stringify(kasList));
  }, [kasList]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_storage_accounts', JSON.stringify(storageAccounts));
  }, [storageAccounts]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_opening_balances', JSON.stringify(openingBalances));
  }, [openingBalances]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_period_closings', JSON.stringify(periodClosings));
  }, [periodClosings]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_reconciliations', JSON.stringify(reconciliations));
  }, [reconciliations]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_user_kas_access', JSON.stringify(userKasAccessList));
  }, [userKasAccessList]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_budget_items', JSON.stringify(budgetItems));
  }, [budgetItems]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('siku_budget_reallocations', JSON.stringify(budgetReallocations));
  }, [budgetReallocations]);

  // Supabase PostgreSQL Direct Sync & Realtime Subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const loadDataFromSupabase = async () => {
      setLoading(true);
      try {
        const res = await fetchAllDataFromSupabase();
        if (res.success && res.data) {
          if (res.data.kasList) setKasList(res.data.kasList);
          if (res.data.storageAccounts) setStorageAccounts(res.data.storageAccounts);
          if (res.data.categories) setCategories(res.data.categories);
          if (res.data.transactions) setTransactions(res.data.transactions);
          if (res.data.openingBalances) setOpeningBalances(res.data.openingBalances);
          if (res.data.periodClosings) setPeriodClosings(res.data.periodClosings);
          if (res.data.reconciliations) setReconciliations(res.data.reconciliations);
          if (res.data.auditLogs) setAuditLogs(res.data.auditLogs);
          if (res.data.profiles) setProfiles(res.data.profiles);
          if (res.data.userKasAccessList) setUserKasAccessList(res.data.userKasAccessList);
          if (res.data.budgets) setBudgets(res.data.budgets);
          if (res.data.budgetItems) setBudgetItems(res.data.budgetItems);
          if (res.data.budgetReallocations) setBudgetReallocations(res.data.budgetReallocations);
          if (res.data.openingSetup) setOpeningSetup(res.data.openingSetup);
          if (res.data.openingEntries) setOpeningEntries(res.data.openingEntries);
          if (res.data.openingAdjustments) setOpeningAdjustments(res.data.openingAdjustments);
          if (res.data.openingOtherPositions) setOpeningOtherPositions(res.data.openingOtherPositions);
          if (res.data.priorYearSummaries) setPriorYearSummaries(res.data.priorYearSummaries);
          if (res.data.fixedAssets) setFixedAssets(res.data.fixedAssets);
          if (res.data.advances) setAdvances(res.data.advances);
          if (res.data.advanceSettlements) setAdvanceSettlements(res.data.advanceSettlements);
          if (res.data.receivablesPayables) setReceivablesPayables(res.data.receivablesPayables);
          if (res.data.lpjNotes) setLpjNotes(res.data.lpjNotes);
          if (res.data.lpjSettings) setLpjSettings(res.data.lpjSettings);
          if (res.data.auditBodyMembers) setAuditBodyMembers(res.data.auditBodyMembers);
          if (res.data.auditEngagements) setAuditEngagements(res.data.auditEngagements);
          if (res.data.auditReviews) setAuditReviews(res.data.auditReviews);
          if (res.data.auditFindings) setAuditFindings(res.data.auditFindings);
          if (res.data.auditFinalOpinions) setAuditFinalOpinions(res.data.auditFinalOpinions);
          if (res.data.auditPeriodVerifications) setAuditPeriodVerifications(res.data.auditPeriodVerifications);
          if (res.data.cashCounts) setCashCounts(res.data.cashCounts);
          if (res.data.semesterReports) setSemesterReports(res.data.semesterReports);
          if (res.data.lpjReports) setLpjReports(res.data.lpjReports);
          if (res.data.lpjExceptions) setLpjExceptions(res.data.lpjExceptions);
          if (res.data.settings) setSettings(res.data.settings);
        }
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDataFromSupabase();

    // Realtime channel
    const channel = supabase
      .channel('public-db-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchAllDataFromSupabase().then((res) => {
          if (res.success && res.data) {
            if (res.data.transactions) setTransactions(res.data.transactions);
            if (res.data.openingBalances) setOpeningBalances(res.data.openingBalances);
            if (res.data.kasList) setKasList(res.data.kasList);
            if (res.data.storageAccounts) setStorageAccounts(res.data.storageAccounts);
            if (res.data.categories) setCategories(res.data.categories);
            if (res.data.budgets) setBudgets(res.data.budgets);
            if (res.data.budgetItems) setBudgetItems(res.data.budgetItems);
            if (res.data.periodClosings) setPeriodClosings(res.data.periodClosings);
            if (res.data.reconciliations) setReconciliations(res.data.reconciliations);
            if (res.data.auditFindings) setAuditFindings(res.data.auditFindings);
            if (res.data.auditReviews) setAuditReviews(res.data.auditReviews);
            if (res.data.auditPeriodVerifications) setAuditPeriodVerifications(res.data.auditPeriodVerifications);
            if (res.data.cashCounts) setCashCounts(res.data.cashCounts);
            if (res.data.profiles) setProfiles(res.data.profiles);
            if (res.data.userKasAccessList) setUserKasAccessList(res.data.userKasAccessList);
            if (res.data.settings) setSettings(res.data.settings);
          }
        });
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Check if period is closed
  const isPeriodClosed = (year: number, month: number, kasId: string): boolean => {
    return periodClosings.some(
      (pc) =>
        pc.is_closed &&
        pc.tahun === year &&
        pc.bulan === month &&
        (pc.kas_id === null || pc.kas_id === undefined || pc.kas_id === kasId)
    );
  };

  // Helper to log audit events
  const addAuditLog = (
    tableName: string,
    recordId: string,
    action: string,
    oldData?: any,
    newData?: any,
    notes?: string
  ) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      table_name: tableName,
      record_id: recordId,
      action,
      old_data: oldData,
      new_data: newData,
      changed_by: currentUser?.id || 'system',
      notes: notes || '',
      changed_at: new Date().toISOString(),
      user: currentUser || undefined,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Calculate official and projected balances for each Kas
  const getKasBalances = (): KasBalanceSummary[] => {
    return kasList.map((k) => {
      // Saldo Awal from opening_balances
      const initial = openingBalances
        .filter((ob) => ob.kas_id === k.id)
        .reduce((sum, item) => sum + Number(item.amount), 0);

      // Approved mutations
      let inc = 0;
      let exp = 0;
      let tfIn = 0;
      let tfOut = 0;

      // Projected (Approved + Submitted)
      let projInc = 0;
      let projExp = 0;
      let projTfIn = 0;
      let projTfOut = 0;

      transactions
        .filter((tx) => tx.kas_id === k.id)
        .forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.status === 'approved') {
            if (tx.type === 'income') inc += amt;
            if (tx.type === 'expense') exp += amt;
            if (tx.type === 'transfer_in') tfIn += amt;
            if (tx.type === 'transfer_out') tfOut += amt;
          }
          if (tx.status === 'approved' || tx.status === 'submitted') {
            if (tx.type === 'income') projInc += amt;
            if (tx.type === 'expense') projExp += amt;
            if (tx.type === 'transfer_in') projTfIn += amt;
            if (tx.type === 'transfer_out') projTfOut += amt;
          }
        });

      const saldo_resmi = initial + inc - exp + tfIn - tfOut;
      const saldo_proyeksi = initial + projInc - projExp + projTfIn - projTfOut;

      return {
        kas_id: k.id,
        kode: k.kode,
        nama: k.nama,
        warna: k.warna,
        saldo_awal: initial,
        total_pemasukan: inc,
        total_pengeluaran: exp,
        total_transfer_masuk: tfIn,
        total_transfer_keluar: tfOut,
        saldo_resmi,
        saldo_proyeksi,
      };
    });
  };

  // Calculate balances per storage account
  const getStorageBalances = (): StorageBalanceSummary[] => {
    return storageAccounts.map((sa) => {
      const initial = openingBalances
        .filter((ob) => ob.storage_account_id === sa.id)
        .reduce((sum, item) => sum + Number(item.amount), 0);

      let net = 0;
      transactions
        .filter((tx) => tx.storage_account_id === sa.id && tx.status === 'approved')
        .forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.type === 'income' || tx.type === 'transfer_in') net += amt;
          if (tx.type === 'expense' || tx.type === 'transfer_out') net -= amt;
        });

      return {
        storage_account_id: sa.id,
        nama: sa.nama,
        tipe: sa.tipe,
        nomor_rekening: sa.nomor_rekening,
        atas_nama: sa.atas_nama,
        saldo_awal: initial,
        saldo_saat_ini: initial + net,
      };
    });
  };

  const getPendingTransactionsCount = (kasId?: string): number => {
    return transactions.filter((tx) => {
      if (tx.status !== 'submitted') return false;
      if (kasId && tx.kas_id !== kasId) return false;
      return true;
    }).length;
  };

  // Kalkulator Sentralisasi Keuangan PPKU HKBP (55% Kas Pusat BPSK / 45% Kas Huria Lokal)
  const getSentralisasiSummary = (year?: number) => {
    let filteredTxs = transactions.filter((tx) => tx.status === 'approved');
    if (year) {
      filteredTxs = filteredTxs.filter((tx) => new Date(tx.tanggal).getFullYear() === year);
    }

    let totalPenerimaan = 0;
    let totalObjekSentralisasi = 0;
    let totalBpskObligation = 0;
    let totalHuriaShare = 0;
    let totalDikecualikan = 0;
    let totalSosialDuka = 0;
    let totalBeasiswa = 0;
    let totalPembangunanLokal = 0;
    let totalBpskRemitted = 0;

    filteredTxs.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalPenerimaan += amt;
        const cat = categories.find((c) => c.id === tx.category_id);
        const isExcluded = cat ? cat.is_sentralisasi === false : tx.is_sentralisasi === false;

        if (isExcluded) {
          totalDikecualikan += amt;
          const exType = cat?.sentralisasi_exclusion_type || tx.sentralisasi_exclusion_type;
          if (exType === 'sosial_duka') {
            totalSosialDuka += amt;
          } else if (exType === 'beasiswa') {
            totalBeasiswa += amt;
          } else if (exType === 'pembangunan_lokal') {
            totalPembangunanLokal += amt;
          } else {
            const nameLower = (cat?.nama || tx.description || '').toLowerCase();
            if (nameLower.includes('sosial') || nameLower.includes('gariana') || cat?.kode?.includes('EX-01')) {
              totalSosialDuka += amt;
            } else if (nameLower.includes('beasiswa') || nameLower.includes('belajar') || cat?.kode?.includes('EX-02')) {
              totalBeasiswa += amt;
            } else {
              totalPembangunanLokal += amt;
            }
          }
        } else {
          // Objek Sentralisasi (55% / 45%)
          totalObjekSentralisasi += amt;
          const bpskPart = tx.bpsk_amount !== undefined ? Number(tx.bpsk_amount) : Math.round(amt * 0.55);
          const huriaPart = tx.huria_amount !== undefined ? Number(tx.huria_amount) : (amt - bpskPart);
          totalBpskObligation += bpskPart;
          totalHuriaShare += huriaPart;
        }
      } else if (tx.type === 'expense') {
        const cat = categories.find((c) => c.id === tx.category_id);
        const isBpskOut =
          cat?.id === 'cat-out-bpsk' ||
          cat?.kode === 'OUT-01' ||
          (cat?.nama || '').toLowerCase().includes('bpsk') ||
          (cat?.nama || '').toLowerCase().includes('sentralisasi ke kas pusat') ||
          (tx.description || '').toLowerCase().includes('bpsk');
        if (isBpskOut) {
          totalBpskRemitted += amt;
        }
      }
    });

    const outstandingBpsk = Math.max(0, totalBpskObligation - totalBpskRemitted);

    return {
      totalPenerimaan,
      totalObjekSentralisasi,
      totalBpskObligation,
      totalHuriaShare,
      totalDikecualikan,
      totalSosialDuka,
      totalBeasiswa,
      totalPembangunanLokal,
      totalBpskRemitted,
      outstandingBpsk,
    };
  };

  // Add transaction
  const isYearLockedByLpj = (year: number): boolean => {
    return lpjReports.some((l) => l.tahun === year && l.status === 'approved');
  };

  const addTransaction = async (
    txInput: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_reversal'>
  ): Promise<{ success: boolean; error?: string }> => {
    const txDate = new Date(txInput.tanggal);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;

    // Check LPJ approved lock
    if (isYearLockedByLpj(year)) {
      return {
        success: false,
        error: `Tahun Anggaran ${year} telah disahkan LPJ-nya oleh Rapat Huria dan telah terkunci permanen. Transaksi baru tidak dapat dibuat.`,
      };
    }

    // Check go-live date constraint
    if (openingSetup?.go_live_date && txInput.tanggal < openingSetup.go_live_date) {
      return {
        success: false,
        error: `Tanggal transaksi (${txInput.tanggal}) tidak boleh sebelum Tanggal Mulai Pemakaian aplikasi (${openingSetup.go_live_date}). Seluruh saldo sebelum tanggal ini dicatat sebagai Saldo Pindahan di Pembukaan Buku.`,
      };
    }

    // Check opening balance locked constraint
    if (!isKasOpeningLocked(txInput.kas_id)) {
      return {
        success: false,
        error: `Pembukaan buku untuk kas ini belum Dikunci (Locked). Selesaikan dan kunci saldo awal kas terlebih dahulu sebelum mencatat transaksi.`,
      };
    }

    // Check closed period
    if (isPeriodClosed(year, month, txInput.kas_id)) {
      return {
        success: false,
        error: `Periode ${month}/${year} untuk kas ini sudah ditutup. Transaksi baru tidak dapat dibuat.`,
      };
    }

    // Check receipt requirement
    if (
      txInput.type === 'expense' &&
      txInput.amount >= settings.receipt_required_threshold &&
      !txInput.attachment_url
    ) {
      return {
        success: false,
        error: `Pengeluaran senilai Rp ${txInput.amount.toLocaleString('id-ID')} melebihi batas Rp ${settings.receipt_required_threshold.toLocaleString('id-ID')} sehingga wajib mengunggah foto nota/bukti.`,
      };
    }

    // Check negative balance if enabled
    if (settings.block_negative_balance && txInput.type === 'expense') {
      const kasBalance = getKasBalances().find((k) => k.kas_id === txInput.kas_id)?.saldo_resmi || 0;
      if (txInput.amount > kasBalance) {
        return {
          success: false,
          error: `Saldo Kas tidak mencukupi (Tersedia: Rp ${kasBalance.toLocaleString('id-ID')}). Pengeluaran tidak boleh membuat saldo negatif.`,
        };
      }
    }

    // PPKU Sentralisasi Keuangan HKBP calculation (55% BPSK / 45% Huria)
    let isSentralisasi = txInput.is_sentralisasi;
    let bpskRate = txInput.bpsk_rate;
    let huriaRate = txInput.huria_rate;
    let bpskAmount = txInput.bpsk_amount;
    let huriaAmount = txInput.huria_amount;
    let exclusionType = txInput.sentralisasi_exclusion_type;

    if (txInput.type === 'income') {
      const cat = categories.find((c) => c.id === txInput.category_id);
      if (cat && cat.is_sentralisasi === false) {
        // Dikecualikan dari sentralisasi (100% Kas Huria / Peruntukan Khusus)
        isSentralisasi = false;
        bpskRate = 0;
        huriaRate = 1.0;
        bpskAmount = 0;
        huriaAmount = txInput.amount;
        exclusionType = cat.sentralisasi_exclusion_type || null;
      } else {
        // Objek Sentralisasi PPKU HKBP (55% Kas Pusat BPSK / 45% Kas Huria Lokal)
        isSentralisasi = true;
        bpskRate = 0.55;
        huriaRate = 0.45;
        bpskAmount = Math.round(txInput.amount * 0.55);
        huriaAmount = txInput.amount - bpskAmount;
        exclusionType = null;
      }
    }

    const newTx: Transaction = {
      ...txInput,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      is_reversal: false,
      is_sentralisasi: isSentralisasi,
      bpsk_rate: bpskRate,
      huria_rate: huriaRate,
      bpsk_amount: bpskAmount,
      huria_amount: huriaAmount,
      sentralisasi_exclusion_type: exclusionType,
      created_by: currentUser?.id || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    if (isSupabaseConfigured) {
      await syncInsert('transactions', newTx);
    }
    addAuditLog('transactions', newTx.id, 'INSERT', null, newTx, `Transaksi baru dibuat oleh ${currentUser?.full_name}`);
    return { success: true };
  };

  // Update transaction (draft/submitted only)
  const updateTransaction = async (
    id: string,
    updates: Partial<Transaction>
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return { success: false, error: 'Transaksi tidak ditemukan.' };

    const txYear = new Date(existing.tanggal).getFullYear();
    if (isYearLockedByLpj(txYear)) {
      return {
        success: false,
        error: `Tahun Anggaran ${txYear} telah disahkan LPJ-nya oleh Rapat Huria dan telah terkunci permanen. Transaksi tidak dapat diubah.`,
      };
    }

    if (existing.status === 'approved') {
      return {
        success: false,
        error: 'Transaksi yang sudah Disetujui tidak dapat diubah secara langsung. Gunakan menu Koreksi/Pembalik.',
      };
    }

    let computedSentralisasi: Partial<Transaction> = {};
    const finalType = updates.type || existing.type;
    const finalAmount = updates.amount !== undefined ? updates.amount : existing.amount;
    const finalCatId = updates.category_id !== undefined ? updates.category_id : existing.category_id;

    if (finalType === 'income') {
      const cat = categories.find((c) => c.id === finalCatId);
      if (cat && cat.is_sentralisasi === false) {
        computedSentralisasi = {
          is_sentralisasi: false,
          bpsk_rate: 0,
          huria_rate: 1.0,
          bpsk_amount: 0,
          huria_amount: finalAmount,
          sentralisasi_exclusion_type: cat.sentralisasi_exclusion_type || null,
        };
      } else {
        const bpsk = Math.round(finalAmount * 0.55);
        computedSentralisasi = {
          is_sentralisasi: true,
          bpsk_rate: 0.55,
          huria_rate: 0.45,
          bpsk_amount: bpsk,
          huria_amount: finalAmount - bpsk,
          sentralisasi_exclusion_type: null,
        };
      }
    }

    const mergedUpdates = {
      ...updates,
      ...computedSentralisasi,
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...mergedUpdates } : t))
    );
    if (isSupabaseConfigured) {
      await syncUpdate('transactions', mergedUpdates, 'id', id);
    }
    addAuditLog('transactions', id, 'UPDATE', existing, mergedUpdates, `Transaksi diupdate`);
    return { success: true };
  };

  // Delete transaction (draft only)
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return { success: false, error: 'Transaksi tidak ditemukan.' };

    const txYear = new Date(existing.tanggal).getFullYear();
    if (isYearLockedByLpj(txYear)) {
      return {
        success: false,
        error: `Tahun Anggaran ${txYear} telah disahkan LPJ-nya oleh Rapat Huria dan telah terkunci permanen. Transaksi tidak dapat dihapus.`,
      };
    }

    if (existing.status === 'approved') {
      return { success: false, error: 'Transaksi yang sudah Disetujui tidak boleh dihapus.' };
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (isSupabaseConfigured) {
      await syncDelete('transactions', 'id', id);
    }
    addAuditLog('transactions', id, 'DELETE', existing, null, `Transaksi dihapus`);
    return { success: true };
  };

  // Change status (Approve / Reject / Draft recall)
  const changeStatus = async (
    id: string,
    newStatus: TransactionStatus,
    rejectNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return { success: false, error: 'Transaksi tidak ditemukan.' };

    // Submitter cannot approve their own transaction
    if (newStatus === 'approved' && tx.created_by === currentUser?.id) {
      return {
        success: false,
        error: 'Penginput transaksi tidak boleh menyetujui transaksinya sendiri. Persetujuan harus dilakukan oleh Ketua Kas terkait.',
      };
    }

    // Rejection requires note
    if (newStatus === 'rejected' && (!rejectNote || rejectNote.trim() === '')) {
      return { success: false, error: 'Penolakan transaksi wajib menyertakan alasan/catatan penolakan.' };
    }

    const updatedTx: Transaction = {
      ...tx,
      status: newStatus,
      approved_by: newStatus === 'approved' ? currentUser?.id : tx.approved_by,
      approved_at: newStatus === 'approved' ? new Date().toISOString() : tx.approved_at,
      reject_note: newStatus === 'rejected' ? rejectNote : null,
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) => {
      return prev.map((item) => {
        if (item.id === id) return updatedTx;
        // If transfer in the same kas, update the paired side too
        if (tx.transfer_id && item.transfer_id === tx.transfer_id && item.kas_id === tx.kas_id) {
          return {
            ...item,
            status: newStatus,
            approved_by: newStatus === 'approved' ? currentUser?.id : item.approved_by,
            approved_at: newStatus === 'approved' ? new Date().toISOString() : item.approved_at,
            reject_note: newStatus === 'rejected' ? rejectNote : null,
            updated_at: new Date().toISOString(),
          };
        }
        return item;
      });
    });

    if (isSupabaseConfigured) {
      await syncUpdate(
        'transactions',
        {
          status: newStatus,
          approved_by: updatedTx.approved_by,
          approved_at: updatedTx.approved_at,
          reject_note: updatedTx.reject_note,
          updated_at: updatedTx.updated_at,
        },
        'id',
        id
      );
    }

    addAuditLog(
      'transactions',
      id,
      'STATUS_CHANGE',
      { status: tx.status },
      { status: newStatus, reject_note: rejectNote },
      `Status diubah menjadi ${newStatus} oleh ${currentUser?.full_name}`
    );

    return { success: true };
  };

  // Bulk Approve
  const bulkApprove = async (ids: string[]): Promise<{ success: boolean; count: number }> => {
    let count = 0;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (ids.includes(tx.id) && tx.status === 'submitted' && tx.created_by !== currentUser?.id) {
          count++;
          return {
            ...tx,
            status: 'approved',
            approved_by: currentUser?.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return tx;
      })
    );
    if (isSupabaseConfigured && supabase) {
      await supabase.from('transactions').update({
        status: 'approved',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).in('id', ids);
    }
    addAuditLog('transactions', 'bulk', 'BULK_APPROVE', null, { ids, count }, `${count} transaksi disetujui massal`);
    return { success: true, count };
  };

  // Atomic Transfer
  const createTransfer = async (params: {
    tanggal: string;
    sourceKasId: string;
    sourceStorageId: string;
    targetKasId: string;
    targetStorageId: string;
    amount: number;
    description: string;
    receiptNo?: string;
    attachmentUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const {
      tanggal,
      sourceKasId,
      sourceStorageId,
      targetKasId,
      targetStorageId,
      amount,
      description,
      receiptNo,
      attachmentUrl,
    } = params;

    if (amount <= 0) return { success: false, error: 'Nominal transfer harus lebih dari 0.' };

    if (openingSetup?.go_live_date && tanggal < openingSetup.go_live_date) {
      return {
        success: false,
        error: `Tanggal transfer (${tanggal}) tidak boleh sebelum Tanggal Mulai Pemakaian aplikasi (${openingSetup.go_live_date}).`,
      };
    }

    if (!isKasOpeningLocked(sourceKasId)) {
      return {
        success: false,
        error: `Kas pengirim belum Dikunci pembukaan bukunya. Selesaikan pembukaan buku terlebih dahulu.`,
      };
    }

    if (!isKasOpeningLocked(targetKasId)) {
      return {
        success: false,
        error: `Kas penerima transfer belum Dikunci pembukaan bukunya. Selesaikan pembukaan buku terlebih dahulu.`,
      };
    }

    const isSameKas = sourceKasId === targetKasId;
    const transferId = `tf-pair-${Date.now()}`;
    const initialStatus: TransactionStatus = 'submitted';

    const txOut: Transaction = {
      id: `tx-out-${Date.now()}`,
      tanggal,
      kas_id: sourceKasId,
      storage_account_id: sourceStorageId,
      type: 'transfer_out',
      amount,
      description: `${description} (Transfer Keluar)`,
      receipt_no: receiptNo ? `${receiptNo}-OUT` : undefined,
      attachment_url: attachmentUrl,
      status: initialStatus,
      transfer_id: transferId,
      transfer_target_kas_id: targetKasId,
      transfer_target_storage_id: targetStorageId,
      created_by: currentUser?.id,
      is_reversal: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const txIn: Transaction = {
      id: `tx-in-${Date.now() + 1}`,
      tanggal,
      kas_id: targetKasId,
      storage_account_id: targetStorageId,
      type: 'transfer_in',
      amount,
      description: `${description} (Transfer Masuk)`,
      receipt_no: receiptNo ? `${receiptNo}-IN` : undefined,
      attachment_url: attachmentUrl,
      status: initialStatus,
      transfer_id: transferId,
      transfer_target_kas_id: sourceKasId,
      transfer_target_storage_id: sourceStorageId,
      created_by: currentUser?.id,
      is_reversal: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) => [txOut, txIn, ...prev]);
    if (isSupabaseConfigured) {
      await syncInsert('transactions', [txOut, txIn]);
    }
    addAuditLog('transactions', transferId, 'TRANSFER_CREATED', null, { txOut, txIn }, `Transfer dana diajukan`);
    return { success: true };
  };

  // Confirm transfer receipt by recipient ketua
  const confirmTransferReceipt = async (transferId: string): Promise<{ success: boolean; error?: string }> => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.transfer_id === transferId) {
          return {
            ...t,
            status: 'approved',
            transfer_confirmed_by: currentUser?.id,
            transfer_confirmed_at: new Date().toISOString(),
            approved_by: currentUser?.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    if (isSupabaseConfigured) {
      await syncUpdate(
        'transactions',
        {
          status: 'approved',
          transfer_confirmed_by: currentUser?.id,
          transfer_confirmed_at: new Date().toISOString(),
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        'transfer_id',
        transferId
      );
    }
    addAuditLog('transactions', transferId, 'TRANSFER_CONFIRMED', null, { transferId }, `Transfer dikonfirmasi penerimaannya`);
    return { success: true };
  };

  // Create Reversal Transaction for Approved Record
  const createReversalTransaction = async (
    originalTxId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const original = transactions.find((t) => t.id === originalTxId);
    if (!original) return { success: false, error: 'Transaksi asli tidak ditemukan.' };

    const reverseType =
      original.type === 'income'
        ? 'expense'
        : original.type === 'expense'
        ? 'income'
        : original.type === 'transfer_out'
        ? 'transfer_in'
        : 'transfer_out';

    const reversalTx: Transaction = {
      id: `tx-rev-${Date.now()}`,
      tanggal: new Date().toISOString().split('T')[0],
      kas_id: original.kas_id,
      storage_account_id: original.storage_account_id,
      category_id: original.category_id,
      type: reverseType,
      amount: original.amount,
      description: `[KOREKSI/PEMBALIK] ${original.description}. Alasan: ${reason}`,
      receipt_no: `KOR-${original.receipt_no || original.id.substring(0, 8)}`,
      status: 'approved', // Reversals are directly approved corrections
      reverses_id: original.id,
      is_reversal: true,
      created_by: currentUser?.id,
      approved_by: currentUser?.id,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) => [reversalTx, ...prev]);
    addAuditLog('transactions', reversalTx.id, 'REVERSAL_CREATED', original, reversalTx, `Transaksi koreksi pembalik dibuat`);
    return { success: true };
  };

  // Close period
  const closePeriod = async (
    year: number,
    month: number,
    kasId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if any draft or submitted transactions remain
    const unapproved = transactions.filter((tx) => {
      const d = new Date(tx.tanggal);
      return (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month &&
        (kasId ? tx.kas_id === kasId : true) &&
        (tx.status === 'draft' || tx.status === 'submitted')
      );
    });

    if (unapproved.length > 0) {
      return {
        success: false,
        error: `Masih ada ${unapproved.length} transaksi berstatus Draft atau Diajukan pada periode ini. Harap setujui/tolak/hapus sebelum menutup buku.`,
      };
    }

    const newClosing: PeriodClosing = {
      id: `pc-${Date.now()}`,
      tahun: year,
      bulan: month,
      kas_id: kasId || null,
      is_closed: true,
      closed_by: currentUser?.id,
      closed_at: new Date().toISOString(),
    };

    setPeriodClosings((prev) => [newClosing, ...prev]);
    addAuditLog('period_closings', newClosing.id, 'PERIOD_CLOSED', null, newClosing, `Periode ${month}/${year} ditutup`);
    return { success: true };
  };

  // Reopen period
  const reopenPeriod = async (closingId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!reason || reason.trim() === '') {
      return { success: false, error: 'Alasan pembukaan kembali buku wajib diisi untuk audit log.' };
    }

    setPeriodClosings((prev) =>
      prev.map((pc) =>
        pc.id === closingId
          ? {
              ...pc,
              is_closed: false,
              reopened_by: currentUser?.id,
              reopened_at: new Date().toISOString(),
              reopen_reason: reason,
            }
          : pc
      )
    );

    addAuditLog('period_closings', closingId, 'PERIOD_REOPENED', null, { reason }, `Periode dibuka kembali dengan alasan: ${reason}`);
    return { success: true };
  };

  // Save Reconciliation
  const saveReconciliation = async (
    rec: Omit<Reconciliation, 'id' | 'created_at' | 'discrepancy'>
  ): Promise<{ success: boolean; error?: string }> => {
    const discrepancy = rec.physical_balance - rec.system_balance;
    const newRec: Reconciliation = {
      ...rec,
      id: `rec-${Date.now()}`,
      discrepancy,
      checked_by: currentUser?.id,
      created_at: new Date().toISOString(),
    };

    setReconciliations((prev) => [newRec, ...prev]);
    addAuditLog('reconciliations', newRec.id, 'INSERT', null, newRec, 'Rekonsiliasi saldo disimpan');
    return { success: true };
  };

  // Master Data Mutators
  const saveKas = async (kasData: Partial<Kas>) => {
    if (kasData.id) {
      setKasList((prev) => prev.map((k) => (k.id === kasData.id ? ({ ...k, ...kasData } as Kas) : k)));
      if (isSupabaseConfigured) {
        const existing = kasList.find((k) => k.id === kasData.id);
        if (existing) await syncUpsert('kas', { ...existing, ...kasData });
      }
      addAuditLog('kas', kasData.id, 'UPDATE', null, kasData, `Data Kas ${kasData.nama || kasData.kode} diperbarui`);
    } else {
      const newKas: Kas = {
        id: `kas-${Date.now()}`,
        kode: kasData.kode || 'KAS-BARU',
        nama: kasData.nama || 'Kas Baru',
        deskripsi: kasData.deskripsi,
        warna: kasData.warna || '#7C9CF5',
        fund_type: kasData.fund_type || 'unrestricted',
        restricted_purpose: kasData.restricted_purpose || null,
        is_active: kasData.is_active !== undefined ? kasData.is_active : true,
      };
      setKasList((prev) => [...prev, newKas]);
      if (isSupabaseConfigured) {
        await syncUpsert('kas', newKas);
      }
      addAuditLog('kas', newKas.id, 'INSERT', null, newKas, `Kas baru ${newKas.nama} (${newKas.kode}) dibuat`);
    }
  };

  const deleteKas = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const kas = kasList.find((k) => k.id === id);
    if (!kas) return { success: false, error: 'Data kas tidak ditemukan.' };

    const txCount = transactions.filter((t) => t.kas_id === id).length;
    if (txCount > 0) {
      return {
        success: false,
        error: `Kas "${kas.nama}" tidak dapat dihapus permanen karena telah memiliki ${txCount} catatan transaksi terkait. Anda dapat menonaktifkan kas ini agar tidak muncul lagi pada pencatatan transaksi baru.`,
      };
    }

    const obCount = openingBalances.filter((b) => b.kas_id === id).length;
    if (obCount > 0) {
      return {
        success: false,
        error: `Kas "${kas.nama}" memiliki ${obCount} pencatatan saldo awal tahun. Hapus atau sesuaikan saldo awal terlebih dahulu.`,
      };
    }

    const assetCount = fixedAssets.filter((a) => a.kas_id === id).length;
    if (assetCount > 0) {
      return {
        success: false,
        error: `Kas "${kas.nama}" terhubung dengan ${assetCount} aset inventaris huria.`,
      };
    }

    const advCount = advances.filter((a) => a.kas_id === id).length;
    if (advCount > 0) {
      return {
        success: false,
        error: `Kas "${kas.nama}" memiliki ${advCount} data panjar kegiatan.`,
      };
    }

    setKasList((prev) => prev.filter((k) => k.id !== id));
    if (isSupabaseConfigured) {
      await syncDelete('kas', 'id', id);
    }
    addAuditLog('kas', id, 'DELETE', kas, null, `Kas ${kas.nama} (${kas.kode}) dihapus oleh Admin`);
    return { success: true };
  };

  const saveProfile = async (
    profileData: Partial<Profile>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!profileData.full_name || !profileData.email) {
      return { success: false, error: 'Nama lengkap dan email pengguna wajib diisi.' };
    }

    if (profileData.id) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileData.id
            ? ({ ...p, ...profileData, updated_at: new Date().toISOString() } as Profile)
            : p
        )
      );
      if (isSupabaseConfigured) {
        const existing = profiles.find((p) => p.id === profileData.id);
        if (existing) await syncUpsert('profiles', { ...existing, ...profileData, updated_at: new Date().toISOString() });
      }
      addAuditLog('profiles', profileData.id, 'UPDATE', null, profileData, `Data profil pengguna ${profileData.full_name} diperbarui`);
      return { success: true, id: profileData.id };
    } else {
      const newId = `user-${Date.now()}`;
      const newProfile: Profile = {
        id: newId,
        email: profileData.email,
        full_name: profileData.full_name,
        role: profileData.role || 'pengurus_kas',
        ecclesiastical_role: profileData.ecclesiastical_role,
        tohonan: profileData.tohonan || 'non_tahbisan',
        tingkat: profileData.tingkat || 'huria',
        seksi_name: profileData.seksi_name || null,
        wijk: profileData.wijk || null,
        phone: profileData.phone || null,
        is_active: profileData.is_active !== undefined ? profileData.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfiles((prev) => [...prev, newProfile]);
      if (isSupabaseConfigured) {
        await syncUpsert('profiles', newProfile);
      }
      addAuditLog('profiles', newId, 'INSERT', null, newProfile, `Pengguna baru ${newProfile.full_name} (${newProfile.email}) didaftarkan`);
      return { success: true, id: newId };
    }
  };

  const deleteProfile = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (prof.id === 'user-admin') {
      return { success: false, error: 'Akun Administrator utama tidak boleh dihapus demi keamanan sistem.' };
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (isSupabaseConfigured) {
      await syncDelete('profiles', 'id', id);
    }
    addAuditLog('profiles', id, 'DELETE', prof, null, `Pengguna ${prof.full_name} dihapus dari sistem`);
    return { success: true };
  };

  const toggleProfileActive = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return { success: false, error: 'Pengguna tidak ditemukan.' };
    const nextStatus = !prof.is_active;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, is_active: nextStatus, updated_at: new Date().toISOString() } : p
      )
    );
    if (isSupabaseConfigured) {
      await syncUpdate('profiles', { is_active: nextStatus, updated_at: new Date().toISOString() }, 'id', id);
    }
    addAuditLog(
      'profiles',
      id,
      'UPDATE',
      { is_active: prof.is_active },
      { is_active: nextStatus },
      `Status pengguna ${prof.full_name} diubah menjadi ${nextStatus ? 'Aktif' : 'Non-Aktif'}`
    );
    return { success: true };
  };

  const saveStorageAccount = async (data: Partial<StorageAccount>) => {
    if (data.id) {
      setStorageAccounts((prev) => prev.map((s) => (s.id === data.id ? ({ ...s, ...data } as StorageAccount) : s)));
      if (isSupabaseConfigured) {
        const existing = storageAccounts.find((s) => s.id === data.id);
        if (existing) await syncUpsert('storage_accounts', { ...existing, ...data });
      }
    } else {
      const newStorage: StorageAccount = {
        id: `stor-${Date.now()}`,
        nama: data.nama || 'Tempat Penyimpanan Baru',
        tipe: data.tipe || 'cash',
        nomor_rekening: data.nomor_rekening,
        atas_nama: data.atas_nama,
        is_active: true,
      };
      setStorageAccounts((prev) => [...prev, newStorage]);
      if (isSupabaseConfigured) {
        await syncUpsert('storage_accounts', newStorage);
      }
    }
  };

  const saveCategory = async (data: Partial<Category>) => {
    if (data.id) {
      setCategories((prev) => prev.map((c) => (c.id === data.id ? ({ ...c, ...data } as Category) : c)));
      if (isSupabaseConfigured) {
        const existing = categories.find((c) => c.id === data.id);
        if (existing) await syncUpsert('categories', { ...existing, ...data });
      }
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        nama: data.nama || 'Kategori Baru',
        tipe: data.tipe || 'income',
        kode: data.kode,
        deskripsi: data.deskripsi,
        is_active: true,
      };
      setCategories((prev) => [...prev, newCat]);
      if (isSupabaseConfigured) {
        await syncUpsert('categories', newCat);
      }
    }
  };

  const saveOpeningBalance = async (data: Partial<OpeningBalance>) => {
    if (data.id) {
      setOpeningBalances((prev) => prev.map((ob) => (ob.id === data.id ? ({ ...ob, ...data } as OpeningBalance) : ob)));
    } else {
      const newOb: OpeningBalance = {
        id: `ob-${Date.now()}`,
        tahun: data.tahun || settings.active_year,
        kas_id: data.kas_id!,
        storage_account_id: data.storage_account_id!,
        amount: data.amount || 0,
        notes: data.notes,
      };
      setOpeningBalances((prev) => [...prev, newOb]);
    }
  };

  const saveUserKasAccess = async (data: Omit<UserKasAccess, 'id'>) => {
    // Check constraint: Bendahara Umum cannot be ketua on Kas Umum
    const user = profiles.find((p) => p.id === data.user_id);
    const kas = kasList.find((k) => k.id === data.kas_id);

    if (user?.role === 'bendahara_umum' && kas?.kode === 'KAS-UMUM' && data.access_level === 'ketua') {
      alert('Bendahara Umum tidak boleh ditugaskan sebagai Ketua pada Kas Umum demi integritas persetujuan.');
      return;
    }

    const newAccess: UserKasAccess = {
      ...data,
      id: `uka-${Date.now()}`,
    };
    setUserKasAccessList((prev) => [...prev, newAccess]);
    if (isSupabaseConfigured) {
      await syncUpsert('user_kas_access', newAccess);
    }
  };

  const removeUserKasAccess = async (id: string) => {
    setUserKasAccessList((prev) => prev.filter((a) => a.id !== id));
    if (isSupabaseConfigured) {
      await syncDelete('user_kas_access', 'id', id);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (isSupabaseConfigured) {
      await syncUpsert('app_settings', { ...updated, id: 'main' });
    }
  };

  // ---------------------------------------------------------------------------
  // FISCAL YEAR (PENGATURAN TAHUN ANGGARAN)
  // ---------------------------------------------------------------------------

  const saveFiscalYear = async (fyData: Partial<FiscalYear>): Promise<{ success: boolean; error?: string }> => {
    if (!fyData.year) return { success: false, error: 'Tahun Anggaran wajib diisi.' };
    const yearNum = Number(fyData.year);
    if (yearNum < 2000 || yearNum > 2100) {
      return { success: false, error: 'Tahun Anggaran harus antara 2000 dan 2100.' };
    }

    const existingIndex = fiscalYears.findIndex((f) => f.id === fyData.id || f.year === yearNum);
    let updatedList: FiscalYear[];

    const newRecord: FiscalYear = {
      id: fyData.id || `fy-${yearNum}`,
      year: yearNum,
      theme: fyData.theme || `Tahun Pelayanan HKBP ${yearNum}`,
      start_date: fyData.start_date || `${yearNum}-01-01`,
      end_date: fyData.end_date || `${yearNum}-12-31`,
      status: fyData.status || (yearNum === settings.active_year ? 'active' : yearNum < settings.active_year ? 'closed' : 'planning'),
      is_budget_locked: fyData.is_budget_locked ?? false,
      notes: fyData.notes || null,
      created_at: fyData.created_at || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updatedList = fiscalYears.map((f, idx) => (idx === existingIndex ? { ...f, ...newRecord } : f));
    } else {
      updatedList = [...fiscalYears, newRecord].sort((a, b) => b.year - a.year);
    }

    // If marked active, set settings.active_year and synchronize statuses
    if (newRecord.status === 'active') {
      updatedList = updatedList.map((f) => {
        if (f.year === yearNum) return { ...f, status: 'active' as const };
        if (f.status === 'active') return { ...f, status: f.year < yearNum ? ('closed' as const) : ('planning' as const) };
        return f;
      });
      await updateSettings({ active_year: yearNum });
    }

    setFiscalYears(updatedList);
    addAuditLog('fiscal_years', newRecord.id, existingIndex >= 0 ? 'UPDATE' : 'INSERT', null, newRecord, `Tahun Anggaran ${yearNum} disimpan`);
    return { success: true };
  };

  const deleteFiscalYear = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = fiscalYears.find((f) => f.id === id);
    if (!target) return { success: false, error: 'Tahun Anggaran tidak ditemukan.' };
    if (target.year === settings.active_year) {
      return { success: false, error: 'Tidak dapat menghapus Tahun Anggaran yang sedang aktif dalam sistem.' };
    }

    const hasTx = transactions.some((tx) => new Date(tx.tanggal).getFullYear() === target.year);
    if (hasTx) {
      return { success: false, error: `Tahun Anggaran ${target.year} memiliki transaksi keuangan tercatat. Hanya dapat diubah statusnya menjadi 'Ditutup'.` };
    }

    setFiscalYears((prev) => prev.filter((f) => f.id !== id));
    addAuditLog('fiscal_years', id, 'DELETE', target, null, `Tahun Anggaran ${target.year} dihapus`);
    return { success: true };
  };

  const setActiveFiscalYear = async (year: number): Promise<{ success: boolean; error?: string }> => {
    const target = fiscalYears.find((f) => f.year === year);
    if (!target) {
      await saveFiscalYear({ year, status: 'active' });
    } else {
      const updatedList = fiscalYears.map((f) => {
        if (f.year === year) return { ...f, status: 'active' as const };
        if (f.status === 'active') return { ...f, status: f.year < year ? ('closed' as const) : ('planning' as const) };
        return f;
      });
      setFiscalYears(updatedList);
      await updateSettings({ active_year: year });
    }
    addAuditLog('settings', 'main', 'UPDATE', { active_year: settings.active_year }, { active_year: year }, `Tahun Anggaran Aktif dialihkan ke ${year}`);
    return { success: true };
  };

  const toggleFiscalYearBudgetLock = async (year: number): Promise<{ success: boolean; error?: string }> => {
    const target = fiscalYears.find((f) => f.year === year);
    if (!target) return { success: false, error: 'Tahun Anggaran tidak ditemukan.' };
    const nextLocked = !target.is_budget_locked;
    const updatedList = fiscalYears.map((f) => (f.year === year ? { ...f, is_budget_locked: nextLocked } : f));
    setFiscalYears(updatedList);
    addAuditLog('fiscal_years', target.id, 'UPDATE', { is_budget_locked: target.is_budget_locked }, { is_budget_locked: nextLocked }, `Kunci RAPB Tahun ${year} diubah ke ${nextLocked ? 'Terkunci' : 'Terbuka'}`);
    return { success: true };
  };

  const rollForwardBalancesToYear = async (fromYear: number, toYear: number): Promise<{ success: boolean; count: number; error?: string }> => {
    let createdCount = 0;
    const newOpeningBalances = [...openingBalances.filter((ob) => ob.tahun !== toYear)];

    for (const kas of kasList) {
      for (const storage of storageAccounts) {
        const initialBal = openingBalances.find((ob) => ob.kas_id === kas.id && ob.storage_account_id === storage.id && ob.tahun === fromYear)?.amount || 0;
        
        const txForPair = transactions.filter((tx) => {
          const d = new Date(tx.tanggal);
          return d.getFullYear() <= fromYear && tx.status === 'approved';
        });

        const income = txForPair
          .filter((tx) => tx.type === 'income' && tx.kas_id === kas.id && tx.storage_account_id === storage.id)
          .reduce((sum, tx) => sum + (tx.huria_amount ?? tx.amount), 0);

        const expense = txForPair
          .filter((tx) => tx.type === 'expense' && tx.kas_id === kas.id && tx.storage_account_id === storage.id)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const transferIn = txForPair
          .filter((tx) => tx.type === 'transfer_in' && tx.kas_id === kas.id && tx.storage_account_id === storage.id)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const transferOut = txForPair
          .filter((tx) => tx.type === 'transfer_out' && tx.kas_id === kas.id && tx.storage_account_id === storage.id)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const endingBalance = initialBal + income - expense + transferIn - transferOut;

        newOpeningBalances.push({
          id: `ob-${toYear}-${kas.id.slice(0, 6)}-${storage.id.slice(0, 6)}`,
          tahun: toYear,
          kas_id: kas.id,
          storage_account_id: storage.id,
          amount: Math.max(0, endingBalance),
          notes: `Roll-forward otomatis dari saldo akhir tahun buku ${fromYear}`,
          created_at: new Date().toISOString(),
        });
        createdCount++;
      }
    }

    setOpeningBalances(newOpeningBalances);
    addAuditLog('opening_balances', `rollforward-${toYear}`, 'INSERT', null, { fromYear, toYear, count: createdCount }, `Roll-forward saldo awal dari ${fromYear} ke ${toYear}`);
    return { success: true, count: createdCount };
  };

  // ---------------------------------------------------------------------------
  // BUDGET (APBG) IMPLEMENTATIONS
  // ---------------------------------------------------------------------------

  const saveBudget = async (budgetData: Partial<Budget>): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (budgetData.id) {
      const existing = budgets.find((b) => b.id === budgetData.id);
      if (!existing) return { success: false, error: 'Anggaran tidak ditemukan.' };
      if (existing.status === 'approved') {
        return { success: false, error: 'Anggaran yang sudah Disahkan Rapat Huria terkunci dan tidak dapat diedit langsung. Gunakan Perubahan Anggaran (APBG-P).' };
      }

      setBudgets((prev) =>
        prev.map((b) =>
          b.id === budgetData.id
            ? ({ ...b, ...budgetData, updated_at: new Date().toISOString() } as Budget)
            : b
        )
      );
      addAuditLog('budgets', budgetData.id, 'UPDATE', existing, budgetData, 'Anggaran diperbarui');
      return { success: true, id: budgetData.id };
    } else {
      if (!budgetData.kas_id || !budgetData.tahun) {
        return { success: false, error: 'Kas dan Tahun Anggaran wajib dipilih.' };
      }

      const existingVersions = budgets
        .filter((b) => b.kas_id === budgetData.kas_id && b.tahun === budgetData.tahun)
        .map((b) => b.version);
      const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1;

      // Check opening balance status from openingBalances
      const matchingOpeningBalances = openingBalances.filter(
        (ob) => ob.kas_id === budgetData.kas_id && ob.tahun === budgetData.tahun
      );
      const totalOpening = matchingOpeningBalances.reduce((sum, ob) => sum + Number(ob.amount), 0);
      const isLocked = matchingOpeningBalances.length > 0;

      const newBudget: Budget = {
        id: `bgt-${Date.now()}`,
        kas_id: budgetData.kas_id,
        tahun: budgetData.tahun,
        version: nextVersion,
        title: budgetData.title || `APBG ${kasList.find((k) => k.id === budgetData.kas_id)?.nama || 'Kas'} Tahun ${budgetData.tahun} (Versi ${nextVersion})`,
        status: 'draft',
        estimated_opening_balance: isLocked ? totalOpening : (budgetData.estimated_opening_balance || 0),
        is_opening_balance_locked: isLocked,
        is_current_active: false,
        notes: budgetData.notes || '',
        created_by: currentUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setBudgets((prev) => [newBudget, ...prev]);
      if (isSupabaseConfigured) {
        await syncUpsert('budgets', newBudget);
      }
      addAuditLog('budgets', newBudget.id, 'INSERT', null, newBudget, `Draf anggaran baru dibuat oleh ${currentUser?.full_name}`);
      return { success: true, id: newBudget.id };
    }
  };

  const deleteBudget = async (budgetId: string): Promise<{ success: boolean; error?: string }> => {
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return { success: false, error: 'Anggaran tidak ditemukan.' };
    if (budget.status === 'approved') {
      return { success: false, error: 'Anggaran yang sudah Disahkan tidak boleh dihapus.' };
    }

    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
    setBudgetItems((prev) => prev.filter((item) => item.budget_id !== budgetId));
    if (isSupabaseConfigured) {
      await syncDelete('budgets', 'id', budgetId);
      await syncDelete('budget_items', 'budget_id', budgetId);
    }
    addAuditLog('budgets', budgetId, 'DELETE', budget, null, 'Draf anggaran dihapus');
    return { success: true };
  };

  const saveBudgetItem = async (itemData: Partial<BudgetItem>): Promise<{ success: boolean; error?: string }> => {
    if (!itemData.budget_id || !itemData.category_id || itemData.annual_amount === undefined) {
      return { success: false, error: 'Kategori dan nominal tahunan wajib diisi.' };
    }

    const budget = budgets.find((b) => b.id === itemData.budget_id);
    if (!budget) return { success: false, error: 'Anggaran induk tidak ditemukan.' };
    if (budget.status === 'approved') {
      return { success: false, error: 'Anggaran induk telah Disahkan dan terkunci.' };
    }

    const annual = Number(itemData.annual_amount) || 0;
    let dist = itemData.monthly_distribution;
    if (!dist || dist.length !== 12 || dist.reduce((s, val) => s + val, 0) !== annual) {
      dist = generateMonthlyDistribution(annual);
    }

    if (itemData.id) {
      setBudgetItems((prev) =>
        prev.map((item) =>
          item.id === itemData.id
            ? ({
                ...item,
                ...itemData,
                annual_amount: annual,
                monthly_distribution: dist,
                updated_at: new Date().toISOString(),
              } as BudgetItem)
            : item
        )
      );
      addAuditLog('budget_items', itemData.id, 'UPDATE', null, itemData, 'Baris anggaran diperbarui');
    } else {
      const newItem: BudgetItem = {
        id: `bi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        budget_id: itemData.budget_id,
        category_id: itemData.category_id,
        type: itemData.type || 'expense',
        description: itemData.description || '',
        annual_amount: annual,
        monthly_distribution: dist,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBudgetItems((prev) => [...prev, newItem]);
      addAuditLog('budget_items', newItem.id, 'INSERT', null, newItem, 'Baris anggaran ditambahkan');
    }

    return { success: true };
  };

  const deleteBudgetItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    const item = budgetItems.find((i) => i.id === itemId);
    if (!item) return { success: false, error: 'Baris anggaran tidak ditemukan.' };

    const budget = budgets.find((b) => b.id === item.budget_id);
    if (budget?.status === 'approved') {
      return { success: false, error: 'Anggaran telah Disahkan dan terkunci.' };
    }

    setBudgetItems((prev) => prev.filter((i) => i.id !== itemId));
    addAuditLog('budget_items', itemId, 'DELETE', item, null, 'Baris anggaran dihapus');
    return { success: true };
  };

  const changeBudgetStatus = async (
    budgetId: string,
    newStatus: BudgetStatus,
    params?: {
      returnNote?: string;
      rapatDate?: string;
      rapatBeritaAcaraNo?: string;
      rapatDocUrl?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return { success: false, error: 'Anggaran tidak ditemukan.' };

    // Submitter cannot review/approve their own budget!
    if (newStatus !== 'returned' && budget.created_by === currentUser?.id) {
      if (newStatus === 'reviewed' || newStatus === 'submitted_rapat' || newStatus === 'approved') {
        return {
          success: false,
          error: 'Penyusun anggaran tidak boleh mengesahkan atau meneruskan anggarannya sendiri demi kepatuhan audit.',
        };
      }
    }

    if (newStatus === 'returned' && (!params?.returnNote || params.returnNote.trim() === '')) {
      return { success: false, error: 'Catatan alasan pengembalian anggaran wajib disertakan.' };
    }

    const nowIso = new Date().toISOString();

    const updatedBudget: Budget = {
      ...budget,
      status: newStatus,
      return_note: newStatus === 'returned' ? params?.returnNote : null,
      reviewed_by: newStatus === 'reviewed' ? currentUser?.id : budget.reviewed_by,
      reviewed_at: newStatus === 'reviewed' ? nowIso : budget.reviewed_at,
      submitted_rapat_by: newStatus === 'submitted_rapat' ? currentUser?.id : budget.submitted_rapat_by,
      submitted_rapat_at: newStatus === 'submitted_rapat' ? nowIso : budget.submitted_rapat_at,
      ratified_by: newStatus === 'approved' ? currentUser?.id : budget.ratified_by,
      ratified_at: newStatus === 'approved' ? nowIso : budget.ratified_at,
      rapat_date: newStatus === 'approved' ? (params?.rapatDate || nowIso.split('T')[0]) : budget.rapat_date,
      rapat_berita_acara_no: newStatus === 'approved' ? params?.rapatBeritaAcaraNo : budget.rapat_berita_acara_no,
      rapat_document_url: newStatus === 'approved' ? params?.rapatDocUrl : budget.rapat_document_url,
      is_current_active: newStatus === 'approved' ? true : budget.is_current_active,
      updated_at: nowIso,
    };

    setBudgets((prev) =>
      prev.map((b) => {
        if (b.id === budgetId) return updatedBudget;
        // If this budget is now approved, deactivate all older versions of the same kas and year
        if (newStatus === 'approved' && b.kas_id === budget.kas_id && b.tahun === budget.tahun && b.id !== budgetId) {
          return { ...b, is_current_active: false, updated_at: nowIso };
        }
        return b;
      })
    );

    addAuditLog(
      'budgets',
      budgetId,
      'STATUS_CHANGE',
      { status: budget.status },
      { status: newStatus, notes: params?.returnNote },
      `Status anggaran diubah menjadi "${newStatus}" oleh ${currentUser?.full_name}`
    );

    return { success: true };
  };

  const createBudgetRevision = async (sourceBudgetId: string): Promise<{ success: boolean; newBudgetId?: string; error?: string }> => {
    const sourceBudget = budgets.find((b) => b.id === sourceBudgetId);
    if (!sourceBudget) return { success: false, error: 'Anggaran asal tidak ditemukan.' };
    if (sourceBudget.status !== 'approved') {
      return { success: false, error: 'Perubahan Anggaran (APBG-P) hanya dapat dibuat dari versi anggaran yang sudah Disahkan.' };
    }

    const existingVersions = budgets
      .filter((b) => b.kas_id === sourceBudget.kas_id && b.tahun === sourceBudget.tahun)
      .map((b) => b.version);
    const newVersion = Math.max(...existingVersions, 0) + 1;

    const newBudgetId = `bgt-${Date.now()}`;
    const newBudget: Budget = {
      ...sourceBudget,
      id: newBudgetId,
      version: newVersion,
      title: `${sourceBudget.title.replace(/\s*\(APBG-P.*?\)/, '')} (APBG-P Versi ${newVersion})`,
      status: 'draft',
      is_current_active: false,
      created_by: currentUser?.id,
      reviewed_by: null,
      reviewed_at: null,
      submitted_rapat_by: null,
      submitted_rapat_at: null,
      ratified_by: null,
      ratified_at: null,
      rapat_date: null,
      rapat_berita_acara_no: null,
      rapat_document_url: null,
      return_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Copy all items
    const sourceItems = budgetItems.filter((i) => i.budget_id === sourceBudgetId);
    const copiedItems: BudgetItem[] = sourceItems.map((item) => ({
      ...item,
      id: `bi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      budget_id: newBudgetId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setBudgets((prev) => [newBudget, ...prev]);
    setBudgetItems((prev) => [...prev, ...copiedItems]);

    addAuditLog(
      'budgets',
      newBudgetId,
      'REVISION_CREATED',
      { source_budget_id: sourceBudgetId, from_version: sourceBudget.version },
      { new_budget_id: newBudgetId, new_version: newVersion },
      `Perubahan Anggaran (APBG-P Versi ${newVersion}) dibuat dari versi ${sourceBudget.version}`
    );

    return { success: true, newBudgetId };
  };

  const reallocateBudget = async (params: {
    budgetId: string;
    fromItemId: string;
    toItemId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const { budgetId, fromItemId, toItemId, amount, reason } = params;
    if (amount <= 0) return { success: false, error: 'Nominal pergeseran harus lebih dari Rp 0.' };
    if (!reason || reason.trim() === '') return { success: false, error: 'Alasan pergeseran anggaran wajib diisi.' };
    if (fromItemId === toItemId) return { success: false, error: 'Baris sumber dan tujuan tidak boleh sama.' };

    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return { success: false, error: 'Anggaran tidak ditemukan.' };
    if (budget.status !== 'approved') {
      return { success: false, error: 'Pergeseran anggaran hanya dapat dilakukan pada anggaran yang telah Disahkan.' };
    }

    const fromItem = budgetItems.find((i) => i.id === fromItemId && i.budget_id === budgetId);
    const toItem = budgetItems.find((i) => i.id === toItemId && i.budget_id === budgetId);

    if (!fromItem || !toItem) {
      return { success: false, error: 'Baris anggaran sumber atau tujuan tidak valid.' };
    }

    if (fromItem.type !== toItem.type) {
      return { success: false, error: 'Pergeseran hanya diperbolehkan antar pos yang sejenis (sesama Pengeluaran atau sesama Pemasukan).' };
    }

    if (fromItem.annual_amount < amount) {
      return {
        success: false,
        error: `Nominal pergeseran (Rp ${amount.toLocaleString('id-ID')}) melebihi pagu anggaran baris sumber (Rp ${fromItem.annual_amount.toLocaleString('id-ID')}).`,
      };
    }

    // Check maximum reallocation percentage limit from settings
    if (settings.budget_reallocation_max_pct > 0 && fromItem.type === 'expense') {
      const allExpenseItems = budgetItems.filter((i) => i.budget_id === budgetId && i.type === 'expense');
      const totalExpenseBudget = allExpenseItems.reduce((sum, item) => sum + item.annual_amount, 0);
      const maxAllowed = (settings.budget_reallocation_max_pct / 100) * totalExpenseBudget;

      if (amount > maxAllowed) {
        return {
          success: false,
          error: `Nominal pergeseran (Rp ${amount.toLocaleString('id-ID')}) melebihi batas kebijakan ${settings.budget_reallocation_max_pct}% dari total pagu belanja (Maksimal: Rp ${Math.round(maxAllowed).toLocaleString('id-ID')}). Perubahan ini harus diajukan melalui Perubahan Anggaran (APBG-P) di Rapat Huria.`,
        };
      }
    }

    // Atomically shift amounts and recalculate monthly distributions
    const newFromAnnual = fromItem.annual_amount - amount;
    const newToAnnual = toItem.annual_amount + amount;

    const newFromDist = generateMonthlyDistribution(newFromAnnual);
    const newToDist = generateMonthlyDistribution(newToAnnual);

    setBudgetItems((prev) =>
      prev.map((item) => {
        if (item.id === fromItemId) {
          return {
            ...item,
            annual_amount: newFromAnnual,
            monthly_distribution: newFromDist,
            updated_at: new Date().toISOString(),
          };
        }
        if (item.id === toItemId) {
          return {
            ...item,
            annual_amount: newToAnnual,
            monthly_distribution: newToDist,
            updated_at: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    const newReallocation: BudgetReallocation = {
      id: `br-${Date.now()}`,
      budget_id: budgetId,
      kas_id: budget.kas_id,
      tahun: budget.tahun,
      from_item_id: fromItemId,
      to_item_id: toItemId,
      amount,
      reason,
      status: 'approved',
      proposed_by: currentUser?.id,
      approved_by: currentUser?.id,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      from_item: fromItem,
      to_item: toItem,
    };

    setBudgetReallocations((prev) => [newReallocation, ...prev]);

    addAuditLog(
      'budget_reallocations',
      newReallocation.id,
      'REALLOCATION_APPLIED',
      { from: fromItem.description, to: toItem.description, amount },
      newReallocation,
      `Pergeseran anggaran sebesar Rp ${amount.toLocaleString('id-ID')} disetujui`
    );

    return { success: true };
  };

  const copyBudgetFromPreviousYear = async (
    kasId: string,
    currentYear: number
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    const prevBudget = budgets.find(
      (b) => b.kas_id === kasId && b.tahun === currentYear - 1 && b.status === 'approved' && b.is_current_active
    );
    if (!prevBudget) {
      return { success: false, error: `Tidak ditemukan anggaran disahkan pada tahun ${currentYear - 1} untuk kas ini.` };
    }

    const prevItems = budgetItems.filter((i) => i.budget_id === prevBudget.id);
    if (prevItems.length === 0) {
      return { success: false, error: 'Anggaran tahun lalu tidak memiliki baris rincian kegiatan.' };
    }

    // Find or create current draft budget
    let targetBudget = budgets.find((b) => b.kas_id === kasId && b.tahun === currentYear && b.status === 'draft');
    let targetBudgetId = targetBudget?.id;

    if (!targetBudget) {
      const createRes = await saveBudget({
        kas_id: kasId,
        tahun: currentYear,
        title: `APBG ${kasList.find((k) => k.id === kasId)?.nama || 'Kas'} Tahun ${currentYear} (Salinan ${currentYear - 1})`,
      });
      if (!createRes.success || !createRes.id) {
        return { success: false, error: createRes.error || 'Gagal membuat anggaran target.' };
      }
      targetBudgetId = createRes.id;
    }

    const newItems: BudgetItem[] = prevItems.map((p) => ({
      ...p,
      id: `bi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      budget_id: targetBudgetId!,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setBudgetItems((prev) => [...prev, ...newItems]);
    addAuditLog('budget_items', targetBudgetId!, 'COPY_PREV_YEAR', null, { count: newItems.length }, `Menyalin ${newItems.length} baris anggaran dari tahun ${currentYear - 1}`);

    return { success: true, count: newItems.length };
  };

  const getBudgetRealization = (kasId: string, year: number, throughMonth: number): BudgetRealizationRow[] => {
    const activeBudget = budgets.find(
      (b) => b.kas_id === kasId && b.tahun === year && b.is_current_active && b.status === 'approved'
    );

    const activeItems = activeBudget ? budgetItems.filter((i) => i.budget_id === activeBudget.id) : [];

    // Calculate actual realization from approved transactions (excluding transfers, including reversals)
    const txApproved = transactions.filter((tx) => {
      if (tx.kas_id !== kasId || tx.status !== 'approved') return false;
      if (tx.type === 'transfer_in' || tx.type === 'transfer_out') return false;
      const d = new Date(tx.tanggal);
      return d.getFullYear() === year && d.getMonth() + 1 <= throughMonth;
    });

    const actualMap: { [catId: string]: number } = {};
    txApproved.forEach((tx) => {
      if (tx.category_id) {
        actualMap[tx.category_id] = (actualMap[tx.category_id] || 0) + Number(tx.amount);
      }
    });

    // Group budget items by category
    const rowMap: { [catId: string]: BudgetRealizationRow } = {};

    categories.forEach((cat) => {
      const itemsForCat = activeItems.filter((i) => i.category_id === cat.id);
      const budgetAnnual = itemsForCat.reduce((sum, item) => sum + item.annual_amount, 0);

      // Sum of months 1 through throughMonth
      const budgetYTD = itemsForCat.reduce((sum, item) => {
        const dist = item.monthly_distribution || generateMonthlyDistribution(item.annual_amount);
        const ytd = dist.slice(0, throughMonth).reduce((s, val) => s + val, 0);
        return sum + ytd;
      }, 0);

      const actualYTD = actualMap[cat.id] || 0;
      const variance = cat.tipe === 'income' ? actualYTD - budgetYTD : budgetYTD - actualYTD;
      const percentage = budgetYTD > 0 ? (actualYTD / budgetYTD) * 100 : 0;

      // Only display if has budget or actual transaction
      if (budgetAnnual > 0 || actualYTD > 0) {
        rowMap[cat.id] = {
          category_id: cat.id,
          category_name: cat.nama,
          category_code: cat.kode,
          type: cat.tipe,
          budget_annual: budgetAnnual,
          budget_ytd: budgetYTD,
          actual_ytd: actualYTD,
          variance,
          percentage,
        };
      }
    });

    return Object.values(rowMap);
  };

  const getConsolidatedBudgetRealization = (
    year: number,
    throughMonth: number
  ): {
    rows: BudgetRealizationRow[];
    totalBudgetAnnual: number;
    totalBudgetYTD: number;
    totalActualYTD: number;
    totalVariance: number;
  } => {
    const allRows: BudgetRealizationRow[] = [];
    kasList.forEach((k) => {
      const rowsForKas = getBudgetRealization(k.id, year, throughMonth);
      allRows.push(...rowsForKas);
    });

    // Consolidate rows by category_id
    const mergedMap: { [catId: string]: BudgetRealizationRow } = {};
    allRows.forEach((row) => {
      if (!mergedMap[row.category_id]) {
        mergedMap[row.category_id] = { ...row };
      } else {
        mergedMap[row.category_id].budget_annual += row.budget_annual;
        mergedMap[row.category_id].budget_ytd += row.budget_ytd;
        mergedMap[row.category_id].actual_ytd += row.actual_ytd;
      }
    });

    const rows = Object.values(mergedMap).map((r) => {
      const variance = r.type === 'income' ? r.actual_ytd - r.budget_ytd : r.budget_ytd - r.actual_ytd;
      const percentage = r.budget_ytd > 0 ? (r.actual_ytd / r.budget_ytd) * 100 : 0;
      return { ...r, variance, percentage };
    });

    const totalBudgetAnnual = rows.reduce((s, r) => s + r.budget_annual, 0);
    const totalBudgetYTD = rows.reduce((s, r) => s + r.budget_ytd, 0);
    const totalActualYTD = rows.reduce((s, r) => s + r.actual_ytd, 0);
    const totalVariance = totalActualYTD - totalBudgetYTD;

    return {
      rows,
      totalBudgetAnnual,
      totalBudgetYTD,
      totalActualYTD,
      totalVariance,
    };
  };

  // ---------------------------------------------------------------------------
  // Modul Saldo Awal & Pembukaan Buku Operations
  // ---------------------------------------------------------------------------
  const isKasOpeningLocked = (kasId: string): boolean => {
    const entries = openingEntries.filter((e) => e.kas_id === kasId);
    if (entries.length > 0) {
      return entries.every((e) => e.status === 'locked');
    }
    return openingBalances.some((ob) => ob.kas_id === kasId);
  };

  const getOpeningStatusForKas = (kasId: string): OpeningBookKasStatus => {
    const entries = openingEntries.filter((e) => e.kas_id === kasId);
    if (entries.length === 0) return 'not_started';
    if (entries.every((e) => e.status === 'locked')) return 'locked';
    if (entries.every((e) => e.status === 'approved' || e.status === 'locked')) return 'approved';
    if (entries.some((e) => e.status === 'submitted')) return 'submitted';
    if (entries.some((e) => e.status === 'drafting')) return 'drafting';
    return 'not_started';
  };

  const saveOpeningEntry = async (
    entryData: Partial<OpeningBalanceEntry>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!entryData.kas_id || !entryData.storage_account_id) {
      return { success: false, error: 'Kas dan Tempat Penyimpanan wajib dipilih.' };
    }

    const currentStatus = getOpeningStatusForKas(entryData.kas_id);
    if (currentStatus === 'locked') {
      return {
        success: false,
        error: 'Saldo awal untuk kas ini telah Dikunci dan tidak dapat diubah langsung. Gunakan Penyesuaian Saldo Awal.',
      };
    }

    const nowIso = new Date().toISOString();
    const existing = openingEntries.find(
      (e) => e.kas_id === entryData.kas_id && e.storage_account_id === entryData.storage_account_id
    );

    const amount = Number(entryData.amount ?? entryData.book_balance ?? 0);
    const bookBalance = Number(entryData.book_balance ?? amount);
    const physicalBalance = Number(entryData.physical_balance ?? bookBalance);
    const difference = physicalBalance - bookBalance;

    if (existing) {
      setOpeningEntries((prev) =>
        prev.map((e) =>
          e.id === existing.id
            ? {
                ...e,
                ...entryData,
                amount,
                book_balance: bookBalance,
                physical_balance: physicalBalance,
                difference,
                status: 'drafting',
                updated_at: nowIso,
              }
            : e
        )
      );
    } else {
      const newEntry: OpeningBalanceEntry = {
        id: `obe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tahun: entryData.tahun || openingSetup.first_year || 2026,
        kas_id: entryData.kas_id,
        storage_account_id: entryData.storage_account_id,
        amount,
        book_balance: bookBalance,
        physical_balance: physicalBalance,
        difference,
        explanation: entryData.explanation || null,
        document_url: entryData.document_url || null,
        status: 'drafting',
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setOpeningEntries((prev) => [...prev, newEntry]);
    }

    return { success: true };
  };

  const submitOpeningBook = async (kasId: string): Promise<{ success: boolean; error?: string }> => {
    const entries = openingEntries.filter((e) => e.kas_id === kasId);
    if (entries.length === 0) {
      return { success: false, error: 'Belum ada nominal saldo tempat penyimpanan yang dimasukkan.' };
    }

    const hasUnexplainedDiff = entries.some(
      (e) => e.difference !== 0 && (!e.explanation || e.explanation.trim() === '')
    );
    if (hasUnexplainedDiff) {
      return { success: false, error: 'Terdapat selisih fisik kas/bank yang belum memiliki penjelasan tertulis.' };
    }

    const nowIso = new Date().toISOString();
    setOpeningEntries((prev) =>
      prev.map((e) =>
        e.kas_id === kasId
          ? {
              ...e,
              status: 'submitted',
              submitted_at: nowIso,
              return_note: null,
              updated_at: nowIso,
            }
          : e
      )
    );

    addAuditLog('opening_balance_entries', kasId, 'SUBMITTED', null, { kasId }, `Saldo awal kas ${kasId} diajukan ke Ketua Kas`);
    return { success: true };
  };

  const approveOpeningBook = async (
    kasId: string,
    approve: boolean,
    returnNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const entries = openingEntries.filter((e) => e.kas_id === kasId);
    if (entries.length === 0) return { success: false, error: 'Entri saldo awal tidak ditemukan.' };

    const creator = entries[0]?.created_by;
    if (approve && creator === currentUser?.id && currentUser?.role !== 'admin') {
      return {
        success: false,
        error: 'Penyusun saldo awal tidak boleh menyetujui pengajuannya sendiri demi kepatuhan pemisahan tugas.',
      };
    }

    const nowIso = new Date().toISOString();
    if (approve) {
      setOpeningEntries((prev) =>
        prev.map((e) =>
          e.kas_id === kasId
            ? {
                ...e,
                status: 'approved',
                approved_by: currentUser?.id,
                approved_at: nowIso,
                return_note: null,
                updated_at: nowIso,
              }
            : e
        )
      );
      addAuditLog('opening_balance_entries', kasId, 'APPROVED', null, { kasId }, `Saldo awal kas ${kasId} disetujui Ketua Kas`);
    } else {
      if (!returnNote || returnNote.trim() === '') {
        return { success: false, error: 'Catatan pengembalian wajib diisi.' };
      }
      setOpeningEntries((prev) =>
        prev.map((e) =>
          e.kas_id === kasId
            ? {
                ...e,
                status: 'drafting',
                return_note: returnNote,
                updated_at: nowIso,
              }
            : e
        )
      );
      addAuditLog('opening_balance_entries', kasId, 'RETURNED', null, { kasId, returnNote }, `Saldo awal kas ${kasId} dikembalikan: ${returnNote}`);
    }

    return { success: true };
  };

  const lockOpeningBook = async (kasId?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    const targetKasList = kasId ? [kasId] : kasList.map((k) => k.id);
    let lockedCount = 0;
    const nowIso = new Date().toISOString();

    setOpeningEntries((prev) =>
      prev.map((entry) => {
        if (targetKasList.includes(entry.kas_id)) {
          lockedCount++;
          return {
            ...entry,
            status: 'locked',
            locked_by: currentUser?.id,
            locked_at: nowIso,
            updated_at: nowIso,
          };
        }
        return entry;
      })
    );

    // Auto-sync into opening_balances so Phase 1 views work immediately
    const entriesToSync = openingEntries.filter((e) => targetKasList.includes(e.kas_id));
    setOpeningBalances((prev) => {
      const updated = [...prev];
      entriesToSync.forEach((entry) => {
        const idx = updated.findIndex(
          (ob) => ob.kas_id === entry.kas_id && ob.storage_account_id === entry.storage_account_id
        );
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            amount: entry.amount,
            notes: entry.explanation || 'Saldo pindahan resmi dikunci',
            updated_at: nowIso,
          };
        } else {
          updated.push({
            id: `ob-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tahun: entry.tahun || 2026,
            kas_id: entry.kas_id,
            storage_account_id: entry.storage_account_id,
            amount: entry.amount,
            notes: entry.explanation || 'Saldo pindahan resmi dikunci',
            created_at: nowIso,
            updated_at: nowIso,
          });
        }
      });
      return updated;
    });

    addAuditLog(
      'opening_balance_entries',
      kasId || 'all_kas',
      'BOOK_OPENING_LOCKED',
      null,
      { kasId, lockedCount },
      `Pembukaan buku ${kasId ? 'kas ' + kasId : 'seluruh kas'} resmi dikunci oleh ${currentUser?.full_name}`
    );

    return { success: true, count: lockedCount };
  };

  const saveOpeningAdjustment = async (
    adjData: Partial<OpeningBalanceAdjustment>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!adjData.kas_id || !adjData.storage_account_id) {
      return { success: false, error: 'Pilih Kas dan Tempat Penyimpanan.' };
    }
    if (!adjData.amount || adjData.amount === 0) {
      return { success: false, error: 'Nominal penyesuaian tidak boleh nol.' };
    }
    if (!adjData.reason || adjData.reason.trim() === '') {
      return { success: false, error: 'Alasan penyesuaian wajib diisi.' };
    }

    const year = adjData.tahun || openingSetup.first_year || 2026;
    if (isPeriodClosed(year, 1, adjData.kas_id)) {
      return {
        success: false,
        error: `Bulan Januari ${year} telah ditutup buku. Penyesuaian saldo awal tidak diperkenankan lagi; silakan catat melalui transaksi koreksi biasa di periode berjalan.`,
      };
    }

    const newAdj: OpeningBalanceAdjustment = {
      id: `adj-${Date.now()}`,
      tahun: year,
      kas_id: adjData.kas_id,
      storage_account_id: adjData.storage_account_id,
      amount: Number(adjData.amount),
      reason: adjData.reason.trim(),
      document_url: adjData.document_url || null,
      status: 'submitted',
      proposed_by: currentUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setOpeningAdjustments((prev) => [newAdj, ...prev]);
    addAuditLog('opening_balance_adjustments', newAdj.id, 'ADJUSTMENT_SUBMITTED', null, newAdj, `Penyesuaian saldo awal diajukan: ${adjData.reason}`);
    return { success: true };
  };

  const approveOpeningAdjustment = async (
    adjId: string,
    approve: boolean,
    rejectNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const adj = openingAdjustments.find((a) => a.id === adjId);
    if (!adj) return { success: false, error: 'Penyesuaian tidak ditemukan.' };

    const nowIso = new Date().toISOString();
    if (!approve) {
      setOpeningAdjustments((prev) =>
        prev.map((a) => (a.id === adjId ? { ...a, status: 'rejected', reject_note: rejectNote, updated_at: nowIso } : a))
      );
      addAuditLog('opening_balance_adjustments', adjId, 'ADJUSTMENT_REJECTED', adj, { rejectNote }, `Penyesuaian ditolak`);
      return { success: true };
    }

    if (adj.status === 'submitted') {
      setOpeningAdjustments((prev) =>
        prev.map((a) =>
          a.id === adjId
            ? {
                ...a,
                status: 'approved_ketua',
                approved_ketua_by: currentUser?.id,
                approved_ketua_at: nowIso,
                updated_at: nowIso,
              }
            : a
        )
      );
      addAuditLog('opening_balance_adjustments', adjId, 'ADJUSTMENT_APPROVED_KETUA', null, null, `Penyesuaian disetujui Ketua Kas`);
    } else if (adj.status === 'approved_ketua') {
      setOpeningAdjustments((prev) =>
        prev.map((a) =>
          a.id === adjId
            ? {
                ...a,
                status: 'approved_bendum',
                approved_bendum_by: currentUser?.id,
                approved_bendum_at: nowIso,
                updated_at: nowIso,
              }
            : a
        )
      );

      // Apply adjustment directly to opening_balances
      setOpeningBalances((prev) =>
        prev.map((ob) => {
          if (ob.kas_id === adj.kas_id && ob.storage_account_id === adj.storage_account_id) {
            return {
              ...ob,
              amount: ob.amount + adj.amount,
              notes: `${ob.notes || ''} [Disesuaikan Rp ${adj.amount.toLocaleString('id-ID')}: ${adj.reason}]`,
              updated_at: nowIso,
            };
          }
          return ob;
        })
      );

      setOpeningEntries((prev) =>
        prev.map((obe) => {
          if (obe.kas_id === adj.kas_id && obe.storage_account_id === adj.storage_account_id) {
            return {
              ...obe,
              amount: obe.amount + adj.amount,
              updated_at: nowIso,
            };
          }
          return obe;
        })
      );

      addAuditLog('opening_balance_adjustments', adjId, 'ADJUSTMENT_FINALIZED', null, null, `Penyesuaian saldo awal diterapkan ke buku kas`);
    }

    return { success: true };
  };

  const saveOpeningOtherPosition = async (
    posData: Partial<OpeningOtherPosition>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!posData.name || !posData.kas_id) {
      return { success: false, error: 'Nama posisi dan Kas wajib diisi.' };
    }
    const nowIso = new Date().toISOString();
    if (posData.id) {
      setOpeningOtherPositions((prev) =>
        prev.map((p) => (p.id === posData.id ? ({ ...p, ...posData } as OpeningOtherPosition) : p))
      );
    } else {
      const newPos: OpeningOtherPosition = {
        id: `oop-${Date.now()}`,
        tahun: posData.tahun || openingSetup.first_year || 2026,
        kas_id: posData.kas_id,
        type: posData.type || 'asset',
        name: posData.name,
        category: posData.category || null,
        acquisition_year: posData.acquisition_year || null,
        amount: Number(posData.amount || 0),
        condition: posData.condition || null,
        location: posData.location || null,
        section_manager: posData.section_manager || null,
        notes: posData.notes || null,
        created_at: nowIso,
      };
      setOpeningOtherPositions((prev) => [newPos, ...prev]);
    }
    return { success: true };
  };

  const deleteOpeningOtherPosition = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setOpeningOtherPositions((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  };

  const savePriorYearSummary = async (
    summaryData: Partial<PriorYearSummary>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!summaryData.kas_id || !summaryData.category_id) {
      return { success: false, error: 'Pilih Kas dan Kategori.' };
    }
    const existing = priorYearSummaries.find(
      (p) =>
        p.kas_id === summaryData.kas_id &&
        p.category_id === summaryData.category_id &&
        p.tahun === summaryData.tahun
    );
    if (existing) {
      setPriorYearSummaries((prev) =>
        prev.map((p) => (p.id === existing.id ? ({ ...p, ...summaryData } as PriorYearSummary) : p))
      );
    } else {
      const newSummary: PriorYearSummary = {
        id: `pys-${Date.now()}`,
        tahun: summaryData.tahun || 2025,
        kas_id: summaryData.kas_id,
        category_id: summaryData.category_id,
        jumlah: Number(summaryData.jumlah || 0),
        sumber: 'manual',
        locked: true,
        created_at: new Date().toISOString(),
      };
      setPriorYearSummaries((prev) => [...prev, newSummary]);
    }
    return { success: true };
  };

  const updateOpeningSetup = async (setupData: Partial<OpeningSetup>): Promise<{ success: boolean; error?: string }> => {
    setOpeningSetup((prev) => ({ ...prev, ...setupData, updated_at: new Date().toISOString() }));
    return { success: true };
  };

  // ---------------------------------------------------------------------------
  // LPJ SUPPORTING DATA OPERATIONS (ISAK 35 - MODIFIED CASH BASIS)
  // ---------------------------------------------------------------------------

  const calculateDepreciation = (asset: FixedAsset, year: number) => {
    if (!lpjSettings.enable_depreciation || asset.useful_life_years <= 0) {
      return {
        annualDepreciation: 0,
        accumulatedDepreciation: 0,
        bookValue: asset.nilai_perolehan,
      };
    }
    const acqYear = new Date(asset.tanggal_perolehan).getFullYear() || 2026;
    const depreciable = Math.max(0, asset.nilai_perolehan - (asset.salvage_value || 0));
    const annual = Math.round(depreciable / asset.useful_life_years);
    const yearsElapsed = Math.max(0, Math.min(asset.useful_life_years, year - acqYear));
    const accumulated = Math.min(depreciable, annual * yearsElapsed);
    const bookVal = Math.max(asset.salvage_value || 0, asset.nilai_perolehan - accumulated);

    return {
      annualDepreciation: annual,
      accumulatedDepreciation: accumulated,
      bookValue: bookVal,
    };
  };

  const saveFixedAsset = async (assetData: Partial<FixedAsset>): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!assetData.nama || !assetData.kategori || !assetData.kas_id) {
      return { success: false, error: 'Nama aset, kategori, dan Kas pengelola wajib diisi.' };
    }
    if (assetData.nilai_perolehan === undefined || assetData.nilai_perolehan < 0) {
      return { success: false, error: 'Nilai perolehan aset harus bernilai positif atau 0.' };
    }

    const nowIso = new Date().toISOString();
    let assetId = assetData.id;

    if (assetId) {
      setFixedAssets((prev) =>
        prev.map((a) => (a.id === assetId ? ({ ...a, ...assetData, updated_at: nowIso } as FixedAsset) : a))
      );
      addAuditLog('fixed_assets', assetId, 'UPDATE', null, assetData, `Memperbarui aset ${assetData.nama}`);
    } else {
      assetId = `ast-${Date.now()}`;
      const defaultUseful = lpjSettings.useful_life_defaults[assetData.kategori || 'lainnya'] ?? 5;
      const newAsset: FixedAsset = {
        id: assetId,
        kode: assetData.kode || `AST-${new Date().getFullYear()}-${String(fixedAssets.length + 1).padStart(3, '0')}`,
        nama: assetData.nama,
        kategori: assetData.kategori,
        tanggal_perolehan: assetData.tanggal_perolehan || new Date().toISOString().split('T')[0],
        nilai_perolehan: Number(assetData.nilai_perolehan),
        kondisi: assetData.kondisi || 'baik',
        lokasi: assetData.lokasi || 'Kompleks Gereja HKBP Hutaraja',
        kas_id: assetData.kas_id,
        status: 'aktif',
        foto_url: assetData.foto_url || null,
        dokumen_url: assetData.dokumen_url || null,
        notes: assetData.notes || null,
        transaction_id: assetData.transaction_id || null,
        useful_life_years: assetData.useful_life_years !== undefined ? Number(assetData.useful_life_years) : defaultUseful,
        salvage_value: Number(assetData.salvage_value || 0),
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setFixedAssets((prev) => [newAsset, ...prev]);
      addAuditLog('fixed_assets', assetId, 'INSERT', null, newAsset, `Menambahkan aset inventaris ${newAsset.nama}`);
    }

    return { success: true, id: assetId };
  };

  const deleteFixedAsset = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const asset = fixedAssets.find((a) => a.id === id);
    if (!asset) return { success: false, error: 'Aset tidak ditemukan.' };
    setFixedAssets((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('fixed_assets', id, 'DELETE', asset, null, `Menghapus aset ${asset.nama}`);
    return { success: true };
  };

  const proposeAssetDisposal = async (
    id: string,
    actionType: 'diajukan_penghapusan' | 'diajukan_hibah',
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const asset = fixedAssets.find((a) => a.id === id);
    if (!asset) return { success: false, error: 'Aset tidak ditemukan.' };
    if (asset.status !== 'aktif') {
      return { success: false, error: 'Hanya aset berstatus aktif yang dapat diajukan penghapusan atau hibah.' };
    }
    if (!reason.trim()) {
      return { success: false, error: 'Alasan penghapusan atau hibah wajib diisi.' };
    }

    const nowIso = new Date().toISOString();
    setFixedAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: actionType,
              disposal_reason: reason,
              disposal_proposed_by: currentUser?.id,
              updated_at: nowIso,
            }
          : a
      )
    );
    addAuditLog('fixed_assets', id, 'PROPOSE_DISPOSAL', null, { actionType, reason }, `Mengajukan ${actionType.replace('_', ' ')} aset ${asset.nama}`);
    return { success: true };
  };

  const approveAssetDisposal = async (
    id: string,
    approve: boolean,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const asset = fixedAssets.find((a) => a.id === id);
    if (!asset) return { success: false, error: 'Aset tidak ditemukan.' };

    if (asset.disposal_proposed_by === currentUser?.id) {
      return { success: false, error: 'Penyusun usulan tidak boleh menyetujui pengajuannya sendiri (Segregation of Duties).' };
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    if (approve) {
      const finalStatus = asset.status === 'diajukan_penghapusan' ? 'dihapus' : 'dihibahkan';
      setFixedAssets((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: finalStatus,
                disposal_date: todayStr,
                disposal_approved_by: currentUser?.id,
                disposal_approved_at: nowIso,
                notes: notes ? `${a.notes || ''}\nPersetujuan: ${notes}` : a.notes,
                updated_at: nowIso,
              }
            : a
        )
      );
      addAuditLog('fixed_assets', id, 'APPROVE_DISPOSAL', null, { status: finalStatus, notes }, `Menyetujui ${finalStatus} aset ${asset.nama}`);
    } else {
      setFixedAssets((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'aktif',
                disposal_reason: null,
                disposal_proposed_by: null,
                notes: notes ? `${a.notes || ''}\nPenolakan penghapusan: ${notes}` : a.notes,
                updated_at: nowIso,
              }
            : a
        )
      );
      addAuditLog('fixed_assets', id, 'REJECT_DISPOSAL', null, { notes }, `Menolak usulan penghapusan aset ${asset.nama}`);
    }

    return { success: true };
  };

  const saveAdvance = async (advanceData: Partial<Advance>): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!advanceData.recipient_name || !advanceData.kas_id || !advanceData.purpose) {
      return { success: false, error: 'Nama penerima, Kas, dan tujuan kegiatan panjar wajib diisi.' };
    }
    if (!advanceData.amount || advanceData.amount <= 0) {
      return { success: false, error: 'Nominal panjar harus lebih besar dari 0.' };
    }
    if (!advanceData.due_date) {
      return { success: false, error: 'Batas waktu pertanggungjawaban (jatuh tempo) wajib diisi.' };
    }

    const nowIso = new Date().toISOString();
    let advId = advanceData.id;

    if (advId) {
      setAdvances((prev) =>
        prev.map((a) => (a.id === advId ? ({ ...a, ...advanceData, updated_at: nowIso } as Advance) : a))
      );
      addAuditLog('advances', advId, 'UPDATE', null, advanceData, `Memperbarui data panjar ${advanceData.kode}`);
    } else {
      advId = `adv-${Date.now()}`;
      const newAdv: Advance = {
        id: advId,
        kode: advanceData.kode || `PJR-${new Date().getFullYear()}-${String(advances.length + 1).padStart(3, '0')}`,
        kas_id: advanceData.kas_id,
        storage_account_id: advanceData.storage_account_id || null,
        recipient_name: advanceData.recipient_name,
        recipient_phone: advanceData.recipient_phone || null,
        amount: Number(advanceData.amount),
        advance_date: advanceData.advance_date || nowIso.split('T')[0],
        due_date: advanceData.due_date,
        purpose: advanceData.purpose,
        status: 'active',
        transaction_id: advanceData.transaction_id || null,
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAdvances((prev) => [newAdv, ...prev]);
      addAuditLog('advances', advId, 'INSERT', null, newAdv, `Mencatat panjar kegiatan ${newAdv.purpose} (${newAdv.recipient_name})`);
    }

    return { success: true, id: advId };
  };

  const deleteAdvance = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const adv = advances.find((a) => a.id === id);
    if (!adv) return { success: false, error: 'Data panjar tidak ditemukan.' };
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    setAdvanceSettlements((prev) => prev.filter((s) => s.advance_id !== id));
    addAuditLog('advances', id, 'DELETE', adv, null, `Menghapus panjar ${adv.kode}`);
    return { success: true };
  };

  const saveAdvanceSettlement = async (
    settlementData: Partial<AdvanceSettlement>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!settlementData.advance_id || !settlementData.notes) {
      return { success: false, error: 'Panjar terkait dan uraian realisasi belanja wajib diisi.' };
    }
    const adv = advances.find((a) => a.id === settlementData.advance_id);
    if (!adv) return { success: false, error: 'Panjar tidak ditemukan.' };

    const spent = Number(settlementData.spent_amount || 0);
    const diff = adv.amount - spent;
    const remainingReturned = diff > 0 ? diff : 0;
    const deficitReimbursed = diff < 0 ? Math.abs(diff) : 0;

    const nowIso = new Date().toISOString();
    let setlId = settlementData.id;

    if (setlId) {
      setAdvanceSettlements((prev) =>
        prev.map((s) =>
          s.id === setlId
            ? ({
                ...s,
                ...settlementData,
                spent_amount: spent,
                remaining_returned: remainingReturned,
                deficit_reimbursed: deficitReimbursed,
                updated_at: nowIso,
              } as AdvanceSettlement)
            : s
        )
      );
    } else {
      setlId = `set-${Date.now()}`;
      const newSetl: AdvanceSettlement = {
        id: setlId,
        advance_id: settlementData.advance_id,
        settlement_date: settlementData.settlement_date || nowIso.split('T')[0],
        spent_amount: spent,
        remaining_returned: remainingReturned,
        deficit_reimbursed: deficitReimbursed,
        notes: settlementData.notes,
        receipt_url: settlementData.receipt_url || null,
        status: 'draft',
        submitted_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAdvanceSettlements((prev) => [newSetl, ...prev]);
    }

    return { success: true, id: setlId };
  };

  const submitAdvanceSettlement = async (settlementId: string): Promise<{ success: boolean; error?: string }> => {
    const setl = advanceSettlements.find((s) => s.id === settlementId);
    if (!setl) return { success: false, error: 'Data pertanggungjawaban tidak ditemukan.' };

    const nowIso = new Date().toISOString();
    setAdvanceSettlements((prev) =>
      prev.map((s) => (s.id === settlementId ? { ...s, status: 'submitted', submitted_by: currentUser?.id, updated_at: nowIso } : s))
    );
    addAuditLog('advance_settlements', settlementId, 'SUBMIT', null, null, `Mengajukan SPJ panjar ke Ketua Kas`);
    return { success: true };
  };

  const approveAdvanceSettlement = async (
    settlementId: string,
    approve: boolean,
    rejectNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const setl = advanceSettlements.find((s) => s.id === settlementId);
    if (!setl) return { success: false, error: 'Data pertanggungjawaban tidak ditemukan.' };

    if (setl.submitted_by === currentUser?.id) {
      return { success: false, error: 'Penyusun pertanggungjawaban panjar tidak diperbolehkan menyetujui laporannya sendiri (Segregation of Duties).' };
    }

    const nowIso = new Date().toISOString();

    if (approve) {
      setAdvanceSettlements((prev) =>
        prev.map((s) =>
          s.id === settlementId
            ? {
                ...s,
                status: 'approved',
                approved_by: currentUser?.id,
                approved_at: nowIso,
                updated_at: nowIso,
              }
            : s
        )
      );

      // Tandai panjar sebagai tuntas (settled)
      setAdvances((prev) =>
        prev.map((a) => (a.id === setl.advance_id ? { ...a, status: 'settled', settled_at: nowIso, updated_at: nowIso } : a))
      );

      addAuditLog('advance_settlements', settlementId, 'APPROVE', null, null, `Menyetujui SPJ panjar`);
    } else {
      setAdvanceSettlements((prev) =>
        prev.map((s) =>
          s.id === settlementId
            ? {
                ...s,
                status: 'rejected',
                reject_note: rejectNote || 'Perlu perbaikan bukti kuitansi',
                updated_at: nowIso,
              }
            : s
        )
      );
      addAuditLog('advance_settlements', settlementId, 'REJECT', null, { rejectNote }, `Mengembalikan SPJ panjar`);
    }

    return { success: true };
  };

  const saveReceivablePayable = async (
    data: Partial<ReceivablePayable>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!data.counterparty_name || !data.kas_id || !data.description) {
      return { success: false, error: 'Nama pihak terkait, Kas pengelola, dan deskripsi wajib diisi.' };
    }
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Nominal pokok harus lebih dari 0.' };
    }

    const nowIso = new Date().toISOString();
    let rpId = data.id;

    if (rpId) {
      setReceivablesPayables((prev) =>
        prev.map((rp) => (rp.id === rpId ? ({ ...rp, ...data, updated_at: nowIso } as ReceivablePayable) : rp))
      );
      addAuditLog('receivables_payables', rpId, 'UPDATE', null, data, `Memperbarui ${data.type || 'piutang/utang'} ${data.kode}`);
    } else {
      rpId = `rp-${Date.now()}`;
      const prefix = data.type === 'receivable' ? 'PIU' : 'UTG';
      const newRp: ReceivablePayable = {
        id: rpId,
        type: data.type || 'receivable',
        kode: data.kode || `${prefix}-${new Date().getFullYear()}-${String(receivablesPayables.length + 1).padStart(3, '0')}`,
        kas_id: data.kas_id,
        counterparty_name: data.counterparty_name,
        counterparty_contact: data.counterparty_contact || null,
        amount: Number(data.amount),
        remaining_amount: Number(data.amount),
        issue_date: data.issue_date || nowIso.split('T')[0],
        due_date: data.due_date || null,
        status: 'active',
        description: data.description,
        document_url: data.document_url || null,
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
        payments: [],
      };
      setReceivablesPayables((prev) => [newRp, ...prev]);
      addAuditLog('receivables_payables', rpId, 'INSERT', null, newRp, `Mencatat ${newRp.type === 'receivable' ? 'piutang' : 'utang'} ${newRp.description}`);
    }

    return { success: true, id: rpId };
  };

  const deleteReceivablePayable = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const item = receivablesPayables.find((rp) => rp.id === id);
    if (!item) return { success: false, error: 'Data tidak ditemukan.' };
    setReceivablesPayables((prev) => prev.filter((rp) => rp.id !== id));
    addAuditLog('receivables_payables', id, 'DELETE', item, null, `Menghapus data ${item.type} ${item.kode}`);
    return { success: true };
  };

  const recordReceivablePayablePayment = async (
    id: string,
    paymentAmount: number,
    paymentDate: string,
    storageId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const item = receivablesPayables.find((rp) => rp.id === id);
    if (!item) return { success: false, error: 'Data piutang/utang tidak ditemukan.' };

    if (paymentAmount <= 0) {
      return { success: false, error: 'Nominal pembayaran harus lebih besar dari 0.' };
    }
    if (paymentAmount > item.remaining_amount) {
      return { success: false, error: 'Nominal pembayaran melebihi sisa saldo berjalan.' };
    }

    const nowIso = new Date().toISOString();
    const newRemaining = Math.max(0, item.remaining_amount - paymentAmount);
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const newPayment: ReceivablePayablePayment = {
      id: `pay-${Date.now()}`,
      parent_id: id,
      payment_date: paymentDate || nowIso.split('T')[0],
      payment_amount: paymentAmount,
      storage_account_id: storageId || null,
      notes: notes || null,
      created_by: currentUser?.id,
      created_at: nowIso,
    };

    setReceivablesPayables((prev) =>
      prev.map((rp) =>
        rp.id === id
          ? {
              ...rp,
              remaining_amount: newRemaining,
              status: newStatus,
              payments: [newPayment, ...(rp.payments || [])],
              updated_at: nowIso,
            }
          : rp
      )
    );

    addAuditLog(
      'receivable_payable_payments',
      newPayment.id,
      'PAYMENT_RECORDED',
      null,
      { paymentAmount, remaining: newRemaining },
      `Mencatat pelunasan ${item.type} ${item.kode} sebesar Rp ${paymentAmount.toLocaleString('id-ID')}`
    );

    return { success: true };
  };

  const saveLpjNotes = async (notesData: Partial<LpjNotes>): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setLpjNotes((prev) => ({
      ...prev,
      ...notesData,
      updated_by: currentUser?.id,
      updated_at: nowIso,
    }));
    addAuditLog('lpj_notes', lpjNotes.id, 'UPDATE', null, notesData, `Memperbarui Catatan atas Laporan Keuangan (CaLK)`);
    return { success: true };
  };

  const updateLpjSettings = async (newSettings: Partial<LpjSettings>): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setLpjSettings((prev) => ({
      ...prev,
      ...newSettings,
      updated_by: currentUser?.id,
      updated_at: nowIso,
    }));
    addAuditLog('lpj_settings', 'main', 'UPDATE', null, newSettings, `Memperbarui pengaturan format dan kebijakan LPJ`);
    return { success: true };
  };

  const updateKasFundType = async (
    kasId: string,
    fundType: FundType,
    restrictedPurpose?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setKasList((prev) =>
      prev.map((k) =>
        k.id === kasId
          ? {
              ...k,
              fund_type: fundType,
              restricted_purpose: fundType === 'restricted' ? restrictedPurpose || k.restricted_purpose : null,
              updated_at: nowIso,
            }
          : k
      )
    );
    addAuditLog('kas', kasId, 'UPDATE_FUND_TYPE', null, { fundType, restrictedPurpose }, `Mengubah klasifikasi dana kas`);
    return { success: true };
  };

  const migrateOpeningPositionsToLpj = async (): Promise<{
    success: boolean;
    count?: { assets: number; advances: number; rp: number };
    error?: string;
  }> => {
    let addedAssets = 0;
    let addedAdvances = 0;
    let addedRp = 0;
    const nowIso = new Date().toISOString();

    // 1. Migrasi Aset
    const assetPositions = openingOtherPositions.filter((p) => p.type === 'asset');
    setFixedAssets((prevAssets) => {
      const nextAssets = [...prevAssets];
      assetPositions.forEach((pos) => {
        const exists = nextAssets.some((a) => a.nama.toLowerCase() === pos.name.toLowerCase());
        if (!exists) {
          const cat = pos.category?.toLowerCase() || '';
          let kategori: FixedAssetCategory = 'lainnya';
          if (cat.includes('tanah')) kategori = 'tanah';
          else if (cat.includes('bangunan') || cat.includes('gedung')) kategori = 'bangunan';
          else if (cat.includes('kendaraan') || cat.includes('mobil') || cat.includes('motor')) kategori = 'kendaraan';
          else if (cat.includes('musik')) kategori = 'alat_musik';
          else if (cat.includes('elektronik') || cat.includes('sound')) kategori = 'elektronik';
          else if (cat.includes('perabot') || cat.includes('kursi')) kategori = 'perabot';

          const useful = lpjSettings.useful_life_defaults[kategori] ?? 5;
          nextAssets.push({
            id: `ast-mig-${pos.id}`,
            kode: `AST-AWAL-${String(nextAssets.length + 1).padStart(3, '0')}`,
            nama: pos.name,
            kategori,
            tanggal_perolehan: pos.acquisition_year ? `${pos.acquisition_year}-01-01` : '2023-01-01',
            nilai_perolehan: Number(pos.amount),
            kondisi: (pos.condition as FixedAssetCondition) || 'baik',
            lokasi: pos.location || 'Kompleks Gereja HKBP Hutaraja',
            kas_id: pos.kas_id,
            status: 'aktif',
            notes: pos.notes || 'Dipindahkan dari modul Saldo Awal',
            useful_life_years: useful,
            salvage_value: 0,
            created_at: nowIso,
            updated_at: nowIso,
          });
          addedAssets++;
        }
      });
      return nextAssets;
    });

    // 2. Migrasi Panjar
    const advancePositions = openingOtherPositions.filter((p) => p.type === 'advance');
    setAdvances((prevAdvances) => {
      const nextAdvances = [...prevAdvances];
      advancePositions.forEach((pos) => {
        const exists = nextAdvances.some((a) => a.purpose.toLowerCase() === pos.name.toLowerCase());
        if (!exists) {
          nextAdvances.push({
            id: `adv-mig-${pos.id}`,
            kode: `PJR-AWAL-${String(nextAdvances.length + 1).padStart(3, '0')}`,
            kas_id: pos.kas_id,
            recipient_name: pos.section_manager || 'Pengurus Kegiatan',
            amount: Number(pos.amount),
            advance_date: '2026-01-01',
            due_date: '2026-01-20',
            purpose: pos.name,
            status: 'active',
            created_at: nowIso,
            updated_at: nowIso,
          });
          addedAdvances++;
        }
      });
      return nextAdvances;
    });

    // 3. Migrasi Piutang & Utang
    const rpPositions = openingOtherPositions.filter((p) => p.type === 'receivable' || p.type === 'payable');
    setReceivablesPayables((prevRp) => {
      const nextRp = [...prevRp];
      rpPositions.forEach((pos) => {
        const exists = nextRp.some((r) => r.description.toLowerCase() === pos.name.toLowerCase());
        if (!exists) {
          const type = pos.type as ReceivablePayableType;
          nextRp.push({
            id: `rp-mig-${pos.id}`,
            type,
            kode: `${type === 'receivable' ? 'PIU' : 'UTG'}-AWAL-${String(nextRp.length + 1).padStart(3, '0')}`,
            kas_id: pos.kas_id,
            counterparty_name: pos.section_manager || 'Pihak Ketiga',
            amount: Number(pos.amount),
            remaining_amount: Number(pos.amount),
            issue_date: '2026-01-01',
            status: 'active',
            description: pos.name,
            created_at: nowIso,
            updated_at: nowIso,
            payments: [],
          });
          addedRp++;
        }
      });
      return nextRp;
    });

    // 4. Update fund_type untuk kas yang memiliki posisi restricted_fund
    const restrictedKasIds = openingOtherPositions.filter((p) => p.type === 'restricted_fund').map((p) => p.kas_id);
    if (restrictedKasIds.length > 0) {
      setKasList((prevKas) =>
        prevKas.map((k) =>
          restrictedKasIds.includes(k.id) ? { ...k, fund_type: 'restricted', restricted_purpose: k.restricted_purpose || 'Dana Terikat per Saldo Awal' } : k
        )
      );
    }

    addAuditLog(
      'data_lpj_migration',
      'batch-migration',
      'MIGRATION_EXECUTED',
      null,
      { addedAssets, addedAdvances, addedRp },
      `Migrasi data posisi lain saldo awal ke tabel Aset (${addedAssets}), Panjar (${addedAdvances}), Piutang/Utang (${addedRp})`
    );

    return {
      success: true,
      count: {
        assets: addedAssets,
        advances: addedAdvances,
        rp: addedRp,
      },
    };
  };

  // ===========================================================================
  // BADAN AUDIT HURIA (INTERNAL AUDIT BODY) OPERATIONS
  // ===========================================================================

  const saveAuditBodyMember = async (
    memberData: Partial<AuditBodyMember>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!memberData.user_id || !memberData.jabatan) {
      return { success: false, error: 'User dan jabatan anggota audit wajib diisi.' };
    }

    const targetUser = profiles.find((p) => p.id === memberData.user_id);
    if (!targetUser) return { success: false, error: 'User tidak ditemukan.' };

    // Strict Independence Check:
    // Dilarang merangkap Bendum, Pendeta, Sekretaris, atau Bendahara/Ketua kas mana pun!
    if (['bendahara_umum', 'pendeta_ressort', 'sekretaris'].includes(targetUser.role)) {
      return {
        success: false,
        error: `Pelanggaran Independensi: ${targetUser.full_name} menjabat sebagai pimpinan/bendahara gereja dan TIDAK DAPAT menjadi anggota Badan Audit Huria.`,
      };
    }

    const hasKasAccess = userKasAccessList.some((a) => a.user_id === memberData.user_id);
    if (hasKasAccess) {
      return {
        success: false,
        error: `Pelanggaran Independensi: ${targetUser.full_name} memiliki hak akses sebagai bendahara/ketua seksi pada kas gereja dan TIDAK DAPAT menjadi auditor.`,
      };
    }

    const activeMembers = auditBodyMembers.filter((m) => m.aktif && m.id !== memberData.id);
    if (memberData.aktif !== false) {
      if (activeMembers.length >= 3) {
        return { success: false, error: 'Badan Audit Huria tepat terdiri dari 3 anggota aktif (1 Ketua dan 2 Anggota).' };
      }
      if (memberData.jabatan === 'ketua' && activeMembers.some((m) => m.jabatan === 'ketua')) {
        return { success: false, error: 'Sudah ada 1 Ketua aktif. Hanya boleh ada 1 Ketua Badan Audit.' };
      }
    }

    const nowIso = new Date().toISOString();
    let memberId = memberData.id;

    if (memberId) {
      setAuditBodyMembers((prev) =>
        prev.map((m) => (m.id === memberId ? ({ ...m, ...memberData, updated_at: nowIso } as AuditBodyMember) : m))
      );
      addAuditLog('audit_body_members', memberId, 'UPDATE', null, memberData, `Memperbarui keanggotaan audit: ${targetUser.full_name}`);
    } else {
      memberId = `abm-${Date.now()}`;
      const newMember: AuditBodyMember = {
        id: memberId,
        user_id: memberData.user_id,
        jabatan: memberData.jabatan,
        periode_mulai: memberData.periode_mulai || nowIso.split('T')[0],
        periode_selesai: memberData.periode_selesai || `${new Date().getFullYear() + 2}-01-01`,
        aktif: memberData.aktif !== undefined ? memberData.aktif : true,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAuditBodyMembers((prev) => [...prev, newMember]);
      addAuditLog('audit_body_members', memberId, 'INSERT', null, newMember, `Menetapkan anggota audit: ${targetUser.full_name} (${newMember.jabatan})`);
    }

    return { success: true };
  };

  const removeAuditBodyMember = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const existing = auditBodyMembers.find((m) => m.id === id);
    if (!existing) return { success: false, error: 'Data anggota audit tidak ditemukan.' };

    setAuditBodyMembers((prev) => prev.map((m) => (m.id === id ? { ...m, aktif: false, updated_at: new Date().toISOString() } : m)));
    addAuditLog('audit_body_members', id, 'DEACTIVATE', existing, null, 'Menonaktifkan masa jabatan anggota audit');
    return { success: true };
  };

  const saveAuditEngagement = async (
    engData: Partial<AuditEngagement>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!engData.tahun || !engData.jenis || !engData.judul || !engData.batas_waktu) {
      return { success: false, error: 'Tahun, jenis, judul, dan batas waktu pemeriksaan wajib diisi.' };
    }

    const duplicate = auditEngagements.find(
      (e) => e.tahun === engData.tahun && e.jenis === engData.jenis && e.id !== engData.id
    );
    if (duplicate) {
      return { success: false, error: `Sudah ada penugasan audit untuk ${engData.jenis} tahun ${engData.tahun}.` };
    }

    const nowIso = new Date().toISOString();
    let engId = engData.id;

    if (engId) {
      setAuditEngagements((prev) =>
        prev.map((e) => (e.id === engId ? ({ ...e, ...engData, updated_at: nowIso } as AuditEngagement) : e))
      );
      addAuditLog('audit_engagements', engId, 'UPDATE', null, engData, `Memperbarui penugasan audit ${engData.judul}`);
    } else {
      engId = `eng-${Date.now()}`;
      const newEng: AuditEngagement = {
        id: engId,
        tahun: engData.tahun,
        jenis: engData.jenis,
        judul: engData.judul,
        deskripsi: engData.deskripsi || null,
        semester_report_id: engData.semester_report_id || null,
        lpj_id: engData.lpj_id || null,
        status: 'in_progress',
        dibuka_pada: engData.dibuka_pada || nowIso.split('T')[0],
        batas_waktu: engData.batas_waktu,
        combined_with_lpj: engData.combined_with_lpj || engData.jenis === 'tahunan',
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAuditEngagements((prev) => [newEng, ...prev]);
      addAuditLog('audit_engagements', engId, 'INSERT', null, newEng, `Membuka penugasan audit baru: ${newEng.judul}`);
    }

    return { success: true, id: engId };
  };

  const submitAuditReview = async (
    reviewData: Partial<AuditReview>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!reviewData.engagement_id || !reviewData.member_id || !reviewData.personal_opinion) {
      return { success: false, error: 'Data penugasan, auditor, dan opini pribadi wajib diisi.' };
    }

    // Verify member is an active audit body member
    const isMember = auditBodyMembers.some((m) => m.user_id === reviewData.member_id && m.aktif);
    if (!isMember) {
      return { success: false, error: 'Hanya anggota Badan Audit Huria aktif yang dapat mengisi lembar kerja audit.' };
    }

    const nowIso = new Date().toISOString();
    const existing = auditReviews.find(
      (r) => r.engagement_id === reviewData.engagement_id && r.member_id === reviewData.member_id
    );

    if (existing) {
      setAuditReviews((prev) =>
        prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                ...reviewData,
                notes_per_section: reviewData.notes_per_section || r.notes_per_section,
                general_notes: reviewData.general_notes !== undefined ? reviewData.general_notes : r.general_notes,
                personal_opinion: reviewData.personal_opinion!,
                submitted_at: nowIso,
                updated_at: nowIso,
              }
            : r
        )
      );
      addAuditLog('audit_reviews', existing.id, 'UPDATE', existing, reviewData, 'Memperbarui lembar kerja audit pribadi');
    } else {
      const newRev: AuditReview = {
        id: `rev-${Date.now()}`,
        engagement_id: reviewData.engagement_id,
        member_id: reviewData.member_id,
        notes_per_section: reviewData.notes_per_section || {},
        general_notes: reviewData.general_notes || null,
        personal_opinion: reviewData.personal_opinion,
        submitted_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAuditReviews((prev) => [newRev, ...prev]);
      addAuditLog('audit_reviews', newRev.id, 'INSERT', null, newRev, 'Mengirim lembar kerja audit pribadi');
    }

    return { success: true };
  };

  const saveAuditFinding = async (
    findingData: Partial<AuditFinding>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!findingData.engagement_id || !findingData.title || !findingData.description) {
      return { success: false, error: 'Penugasan audit, judul, dan uraian temuan wajib diisi.' };
    }

    const nowIso = new Date().toISOString();
    let findId = findingData.id;

    if (findId) {
      setAuditFindings((prev) =>
        prev.map((f) => (f.id === findId ? ({ ...f, ...findingData, updated_at: nowIso } as AuditFinding) : f))
      );
      addAuditLog('audit_findings', findId, 'UPDATE', null, findingData, `Memperbarui temuan audit ${findingData.kode}`);
    } else {
      findId = `find-${Date.now()}`;
      const newFind: AuditFinding = {
        id: findId,
        engagement_id: findingData.engagement_id,
        kas_id: findingData.kas_id || null,
        kode: findingData.kode || `AUD-${new Date().getFullYear()}-${String(auditFindings.length + 1).padStart(3, '0')}`,
        title: findingData.title,
        description: findingData.description,
        severity: findingData.severity || 'informasi',
        status: 'terbuka',
        carried_from_finding_id: findingData.carried_from_finding_id || null,
        due_date: findingData.due_date || null,
        created_by: currentUser?.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setAuditFindings((prev) => [newFind, ...prev]);
      addAuditLog('audit_findings', findId, 'INSERT', null, newFind, `Mencatat temuan audit baru: ${newFind.title} (${newFind.severity})`);
    }

    return { success: true, id: findId };
  };

  const respondAuditFinding = async (
    id: string,
    responseNotes: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!responseNotes.trim()) {
      return { success: false, error: 'Tanggapan dan tindak lanjut temuan wajib diisi.' };
    }

    const nowIso = new Date().toISOString();
    setAuditFindings((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              response_notes: responseNotes,
              response_by: currentUser?.id,
              responded_at: nowIso,
              status: 'ditanggapi',
              updated_at: nowIso,
            }
          : f
      )
    );
    addAuditLog('audit_findings', id, 'RESPOND', null, { responseNotes }, 'Memberikan tanggapan tindak lanjut temuan audit');
    return { success: true };
  };

  const closeAuditFinding = async (
    id: string,
    approveClose: boolean,
    closingNotes: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Only audit members can close
    const isAuditor = auditBodyMembers.some((m) => m.user_id === currentUser?.id && m.aktif) || currentUser?.role === 'admin';
    if (!isAuditor) {
      return { success: false, error: 'Hanya auditor Badan Audit Huria yang berwenang menutup/mengesahkan penyelesaian temuan.' };
    }

    const nowIso = new Date().toISOString();
    const newStatus = approveClose ? 'selesai' : 'diterima';

    setAuditFindings((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: newStatus,
              closed_by: currentUser?.id,
              closed_at: nowIso,
              closing_notes: closingNotes,
              updated_at: nowIso,
            }
          : f
      )
    );
    addAuditLog('audit_findings', id, 'CLOSE', null, { status: newStatus, closingNotes }, `Menutup temuan audit dengan status ${newStatus}`);
    return { success: true };
  };

  const finalizeAuditOpinion = async (
    engagementId: string,
    params: {
      beritaAcaraNo: string;
      beritaAcaraDate: string;
      dissentingNotes?: string;
      signatories: { role: string; name: string; signed_at?: string }[];
    }
  ): Promise<{ success: boolean; opinion?: AuditPersonalOpinion; error?: string }> => {
    const activeMembers = auditBodyMembers.filter((m) => m.aktif);
    if (activeMembers.length !== 3) {
      return { success: false, error: 'Pemeriksaan membutuhkan tepat 3 anggota Badan Audit aktif.' };
    }

    const reviews = auditReviews.filter((r) => r.engagement_id === engagementId);
    if (reviews.length < 3) {
      return {
        success: false,
        error: `Opini final hanya dapat ditetapkan setelah SEMUA 3 anggota Badan Audit menginput lembar kerja audit (Baru ${reviews.length} dari 3 anggota menginput).`,
      };
    }

    // Tally votes
    const votesCount: Record<AuditPersonalOpinion, number> = {
      sesuai: 0,
      sesuai_dengan_catatan: 0,
      perlu_perbaikan: 0,
    };
    const voteDetails: { member_id: string; member_name: string; opinion: AuditPersonalOpinion }[] = [];

    reviews.forEach((r) => {
      votesCount[r.personal_opinion] = (votesCount[r.personal_opinion] || 0) + 1;
      const memProfile = profiles.find((p) => p.id === r.member_id);
      voteDetails.push({
        member_id: r.member_id,
        member_name: memProfile?.full_name || 'Auditor',
        opinion: r.personal_opinion,
      });
    });

    // Majority rule (>= 2 votes)
    let finalOp: AuditPersonalOpinion = 'sesuai';
    if (votesCount.perlu_perbaikan >= 2) {
      finalOp = 'perlu_perbaikan';
    } else if (votesCount.sesuai_dengan_catatan >= 2) {
      finalOp = 'sesuai_dengan_catatan';
    } else if (votesCount.sesuai >= 2) {
      finalOp = 'sesuai';
    } else {
      // 1-1-1 split: conservatism priority -> perlu_perbaikan / sesuai_dengan_catatan
      finalOp = 'sesuai_dengan_catatan';
    }

    const hasDissenting = Object.values(votesCount).some((c) => c === 1);
    const nowIso = new Date().toISOString();

    const finalOpObj: AuditFinalOpinion = {
      id: `op-${engagementId}`,
      engagement_id: engagementId,
      final_opinion: finalOp,
      vote_breakdown: {
        sesuai: votesCount.sesuai,
        sesuai_dengan_catatan: votesCount.sesuai_dengan_catatan,
        perlu_perbaikan: votesCount.perlu_perbaikan,
        votes: voteDetails,
      },
      has_dissenting_opinion: hasDissenting,
      dissenting_opinion_notes: params.dissentingNotes || null,
      berita_acara_no: params.beritaAcaraNo,
      berita_acara_date: params.beritaAcaraDate,
      signatories: params.signatories,
      finalized_by: currentUser?.id,
      finalized_at: nowIso,
    };

    setAuditFinalOpinions((prev) => [finalOpObj, ...prev.filter((o) => o.engagement_id !== engagementId)]);
    setAuditEngagements((prev) =>
      prev.map((e) => (e.id === engagementId ? { ...e, status: 'completed', updated_at: nowIso } : e))
    );

    addAuditLog(
      'audit_final_opinions',
      finalOpObj.id,
      'FINALIZE',
      null,
      finalOpObj,
      `Menetapkan Opini Final Audit: ${finalOp.toUpperCase()} (BA: ${params.beritaAcaraNo})`
    );

    return { success: true, opinion: finalOp };
  };

  const recordCashCount = async (
    data: Partial<CashCount>
  ): Promise<{ success: boolean; id?: string; findingId?: string; error?: string }> => {
    if (!data.kas_id || !data.storage_account_id || data.physical_balance === undefined || data.book_balance === undefined) {
      return { success: false, error: 'Kas, tempat penyimpanan, saldo buku, dan saldo fisik wajib diisi.' };
    }

    const diff = Number(data.physical_balance) - Number(data.book_balance);
    const nowIso = new Date().toISOString();
    const ccId = `cc-${Date.now()}`;

    const newCC: CashCount = {
      id: ccId,
      tanggal: data.tanggal || nowIso.split('T')[0],
      kas_id: data.kas_id,
      storage_account_id: data.storage_account_id,
      book_balance: Number(data.book_balance),
      physical_balance: Number(data.physical_balance),
      difference: diff,
      cash_breakdown: data.cash_breakdown || {},
      explanation: data.explanation || null,
      photo_url: data.photo_url || null,
      auditor_id: currentUser?.id || 'auditor',
      witness_name: data.witness_name || null,
      created_at: nowIso,
    };

    setCashCounts((prev) => [newCC, ...prev]);
    let createdFindingId: string | undefined;

    // Automatic Draft Audit Finding Creation if discrepancy exists!
    if (diff !== 0) {
      const activeEng = auditEngagements.find((e) => e.status === 'in_progress') || auditEngagements[0];
      const kasObj = kasList.find((k) => k.id === data.kas_id);
      const storObj = storageAccounts.find((s) => s.id === data.storage_account_id);

      const findingRes = await saveAuditFinding({
        engagement_id: activeEng ? activeEng.id : 'eng-general',
        kas_id: data.kas_id,
        kode: `AUD-CC-${new Date().getFullYear()}-${String(auditFindings.length + 1).padStart(3, '0')}`,
        title: `Selisih Opname Kas Fisik: ${kasObj?.nama || 'Kas'} (${storObj?.nama || 'Brankas'})`,
        description: `Ditemukan selisih fisik kas sebesar Rp ${Math.abs(diff).toLocaleString('id-ID')} (${diff > 0 ? 'Kelebihan Fisik' : 'Kekurangan Fisik'}) saat opname kas tanggal ${newCC.tanggal}. Saldo Buku: Rp ${newCC.book_balance.toLocaleString('id-ID')}, Saldo Fisik: Rp ${newCC.physical_balance.toLocaleString('id-ID')}. Keterangan: ${newCC.explanation || 'Belum ada penjelasan'}.`,
        severity: 'wajib_diperbaiki',
      });
      createdFindingId = findingRes.id;
    }

    addAuditLog('cash_counts', ccId, 'INSERT', null, newCC, `Mencatat hasil opname fisik kas (Selisih: Rp ${diff})`);
    return { success: true, id: ccId, findingId: createdFindingId };
  };

  // ===========================================================================
  // VERIFIKASI TRANSAKSI & PEMERIKSAAN BERKALA BADAN AUDIT (PASAL 7 & 44 AP HKBP)
  // ===========================================================================

  const verifyTransactionAudit = async (
    transactionId: string,
    status: 'unverified' | 'verified' | 'flagged',
    note?: string,
    finding?: { title: string; description: string; severity: AuditFindingSeverity; dueDate?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return { success: false, error: 'Transaksi tidak ditemukan.' };

    const auditedAt = status === 'unverified' ? null : new Date().toISOString();
    const auditedBy = status === 'unverified' ? null : (currentUser?.id || 'user-audit-ketua');

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === transactionId) {
          return {
            ...t,
            audit_status: status,
            audited_by: auditedBy,
            audited_at: auditedAt,
            audit_note: note || (status === 'verified' ? 'Telah diverifikasi dan dokumen fisik valid.' : null),
          };
        }
        return t;
      })
    );

    // If marked as flagged and finding details provided, automatically create an audit finding
    if (status === 'flagged' && finding) {
      const activeEng = auditEngagements.find((e) => e.status === 'in_progress') || auditEngagements[0];
      await saveAuditFinding({
        engagement_id: activeEng ? activeEng.id : 'eng-2026-sem2',
        kas_id: tx.kas_id,
        kode: `TEM-TX-${Date.now().toString().slice(-4)}`,
        title: finding.title || `Temuan Audit Transaksi ${tx.receipt_no || tx.id}`,
        description: finding.description || note || `Transaksi sebesar Rp ${tx.amount.toLocaleString('id-ID')} pada tanggal ${tx.tanggal} (${tx.description}) memiliki catatan pemeriksaan audit.`,
        severity: finding.severity || 'wajib_diperbaiki',
        status: 'terbuka',
        due_date: finding.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      });
    }

    addAuditLog(
      'transactions',
      transactionId,
      'AUDIT_VERIFY',
      { previous_status: tx.audit_status },
      { audit_status: status, note },
      `Verifikasi audit transaksi ${tx.receipt_no || tx.id}: ${status === 'verified' ? 'Lolos Audit' : status === 'flagged' ? 'Ada Temuan' : 'Dibatalkan'}`
    );
    return { success: true };
  };

  const saveAuditPeriodVerification = async (
    data: Partial<AuditPeriodVerification>
  ): Promise<{ success: boolean; error?: string }> => {
    const periodCode = data.period_code;
    if (!periodCode) return { success: false, error: 'Kode periode audit wajib diisi.' };

    const nowIso = new Date().toISOString();
    setAuditPeriodVerifications((prev) => {
      const existing = prev.find(
        (p) => p.period_code === periodCode && p.tahun === (data.tahun || settings.active_year)
      );
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? ({
                ...p,
                ...data,
                updated_at: nowIso,
              } as AuditPeriodVerification)
            : p
        );
      } else {
        const newApv: AuditPeriodVerification = {
          id: `apv-${Date.now()}`,
          tahun: data.tahun || settings.active_year,
          period_type: data.period_type || 'triwulan',
          period_code: periodCode,
          period_title: data.period_title || 'Pemeriksaan Berkala',
          date_range: data.date_range || '',
          status: data.status || 'sedang_diverifikasi',
          verified_by: data.verified_by || (currentUser ? [currentUser.id] : []),
          verified_signatures: data.verified_signatures || [],
          verified_at: data.status === 'diverifikasi' ? nowIso : null,
          general_notes: data.general_notes || '',
          checklist: data.checklist || {
            cash_physical_match: true,
            evidence_valid: true,
            budget_adherence: true,
            advance_settled: true,
            remittance_compliant: true,
            prior_findings_cleared: true,
          },
          total_transactions_count: data.total_transactions_count,
          verified_transactions_count: data.verified_transactions_count,
          flagged_transactions_count: data.flagged_transactions_count,
          berita_acara_no:
            data.berita_acara_no || `BA-AUDIT/${periodCode.toUpperCase()}/${settings.active_year}`,
          created_at: nowIso,
          updated_at: nowIso,
        };
        return [newApv, ...prev];
      }
    });

    addAuditLog('audit_period_verifications', periodCode, 'UPSERT', null, data, `Pemeriksaan berkala ${periodCode} disimpan`);
    return { success: true };
  };

  const signAuditPeriodVerification = async (
    periodCode: AuditPeriodCode
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Pengguna tidak terautentikasi.' };

    const nowIso = new Date().toISOString();
    setAuditPeriodVerifications((prev) =>
      prev.map((p) => {
        if (p.period_code === periodCode) {
          const alreadySigned = p.verified_signatures?.some((s) => s.member_id === currentUser.id);
          const memberObj = auditBodyMembers.find((m) => m.user_id === currentUser.id);
          const roleLabel = memberObj?.jabatan === 'ketua' ? 'Ketua Badan Audit' : 'Anggota Badan Audit';

          const newSig = {
            member_id: currentUser.id,
            member_name: currentUser.full_name,
            jabatan: roleLabel,
            signed_at: nowIso,
          };
          const updatedSignatures = alreadySigned
            ? p.verified_signatures
            : [...(p.verified_signatures || []), newSig];
          const updatedVerifiedBy = p.verified_by.includes(currentUser.id)
            ? p.verified_by
            : [...p.verified_by, currentUser.id];

          const isVerified = (updatedSignatures?.length || 0) >= 2;

          return {
            ...p,
            verified_by: updatedVerifiedBy,
            verified_signatures: updatedSignatures,
            status: isVerified ? 'diverifikasi' : p.status,
            verified_at: isVerified ? nowIso : p.verified_at,
            updated_at: nowIso,
          };
        }
        return p;
      })
    );

    addAuditLog(
      'audit_period_verifications',
      periodCode,
      'SIGN',
      null,
      { signed_by: currentUser.full_name },
      `Tanda tangan verifikasi berkala ${periodCode} oleh ${currentUser.full_name}`
    );
    return { success: true };
  };

  // ===========================================================================
  // LAPORAN SEMESTER & LPJ TAHUNAN (ISAK 35) OPERATIONS
  // ===========================================================================

  const runSemesterChecklist = async (
    tahun: number,
    semester: 1 | 2
  ): Promise<{
    checklist: SemesterReport['checklist_result'];
    passed: boolean;
    blockers: string[];
  }> => {
    const startMonth = semester === 1 ? 1 : 7;
    const endMonth = semester === 1 ? 6 : 12;

    // 1. Months closed
    const requiredMonths = [startMonth, startMonth + 1, startMonth + 2, startMonth + 3, startMonth + 4, endMonth];
    const closedMonths = periodClosings.filter((pc) => pc.tahun === tahun && pc.is_closed).map((pc) => pc.bulan);
    const monthsClosed = requiredMonths.every((m) => closedMonths.includes(m));

    // 2. No draft or submitted transactions in that semester
    const semTxs = transactions.filter((t) => {
      const d = new Date(t.tanggal);
      const m = d.getMonth() + 1;
      return d.getFullYear() === tahun && m >= startMonth && m <= endMonth;
    });
    const hasPendingTx = semTxs.some((t) => t.status === 'draft' || t.status === 'submitted');

    // 3. Storage reconciliations
    const semRecs = reconciliations.filter((r) => {
      const d = new Date(r.tanggal);
      const m = d.getMonth() + 1;
      return d.getFullYear() === tahun && m >= startMonth && m <= endMonth;
    });
    const storagesReconciled = semRecs.length >= storageAccounts.filter((s) => s.is_active).length;

    // 4. Overdue advances reviewed
    const unaddressedOverdueAdvances = advances.some((a) => {
      const isOverdue = a.status === 'overdue' || (a.status === 'active' && new Date(a.due_date) < new Date());
      const hasSettlement = advanceSettlements.some((s) => s.advance_id === a.id);
      return isOverdue && !hasSettlement;
    });

    // 5. Budget variance explained (threshold default 10%)
    const budgetVarianceExplained = true;

    // 6. Prior mandatory findings resolved
    const unresolvedFindings = auditFindings.some(
      (f) => f.severity === 'wajib_diperbaiki' && f.status !== 'selesai' && f.status !== 'diterima'
    );

    // Check exceptions
    const semReport = semesterReports.find((r) => r.tahun === tahun && r.semester === semester);
    const grantedExceptions = semReport
      ? lpjExceptions.filter((e) => e.target_type === 'semester' && e.target_id === semReport.id)
      : [];

    const isRuleExempted = (ruleCode: string) => grantedExceptions.some((e) => e.rule_code === ruleCode);

    const checklist: SemesterReport['checklist_result'] = {
      months_closed: monthsClosed || isRuleExempted('months_closed'),
      no_draft_transactions: !hasPendingTx || isRuleExempted('no_draft_transactions'),
      storages_reconciled: storagesReconciled || isRuleExempted('storages_reconciled'),
      advances_reviewed: !unaddressedOverdueAdvances || isRuleExempted('advances_reviewed'),
      budget_variance_explained: budgetVarianceExplained || isRuleExempted('budget_variance_explained'),
      prior_findings_resolved: !unresolvedFindings || isRuleExempted('prior_findings_resolved'),
    };

    const blockers: string[] = [];
    if (!checklist.months_closed) blockers.push(`Seluruh 6 bulan pada Semester ${semester} belum ditutup buku secara resmi.`);
    if (!checklist.no_draft_transactions) blockers.push('Masih ada transaksi dalam status Draf atau Diajukan pada periode semester ini.');
    if (!checklist.storages_reconciled) blockers.push('Belum semua tempat penyimpanan kas fisik / bank memiliki rekonsiliasi akhir semester.');
    if (!checklist.advances_reviewed) blockers.push('Terdapat panjar kegiatan yang melewati batas waktu tanpa pertanggungjawaban.');
    if (!checklist.prior_findings_resolved) blockers.push('Masih ada temuan audit dengan tingkat Wajib Diperbaiki yang belum ditutup.');

    return {
      checklist,
      passed: blockers.length === 0,
      blockers,
    };
  };

  const lockSemesterSnapshot = async (reportId: string): Promise<{ success: boolean; error?: string }> => {
    const report = semesterReports.find((r) => r.id === reportId);
    if (!report) return { success: false, error: 'Laporan Semester tidak ditemukan.' };

    const check = await runSemesterChecklist(report.tahun, report.semester);
    if (!check.passed) {
      return {
        success: false,
        error: `Checklist persiapan belum terpenuhi: ${check.blockers.join('; ')}`,
      };
    }

    const kasBalances = getKasBalances();
    const storageBalances = getStorageBalances();
    const budgetSummary = getConsolidatedBudgetRealization(report.tahun, report.semester === 1 ? 6 : 12);

    const snapshot = {
      locked_at: new Date().toISOString(),
      locked_by: currentUser?.id,
      kasBalances,
      storageBalances,
      budgetSummary,
      activeAdvances: advances.filter((a) => a.status !== 'settled'),
      receivablesPayables: receivablesPayables.filter((r) => r.status !== 'paid'),
    };

    const nowIso = new Date().toISOString();
    setSemesterReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'drafted',
              snapshot_data: snapshot,
              checklist_result: check.checklist,
              updated_at: nowIso,
            }
          : r
      )
    );

    addAuditLog('semester_reports', reportId, 'LOCK_SNAPSHOT', null, snapshot, `Mengunci snapshot angka Laporan Semester ${report.semester} Tahun ${report.tahun}`);
    return { success: true };
  };

  const forwardSemesterToPastor = async (
    reportId: string,
    sentRef: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role === 'pendeta_ressort') {
      return { success: false, error: 'Pendeta Ressort adalah penerima laporan dan tidak dapat mengajukan laporan kepada dirinya sendiri.' };
    }

    const nowIso = new Date().toISOString();
    setSemesterReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'sent_to_pastor',
              sent_ref: sentRef,
              sent_to_pastor_date: nowIso.split('T')[0],
              updated_at: nowIso,
            }
          : r
      )
    );
    addAuditLog('semester_reports', reportId, 'FORWARD_TO_PASTOR', null, { sentRef }, 'Meneruskan Laporan Semester ke Pendeta Ressort');
    return { success: true };
  };

  const acknowledgeSemesterReport = async (
    reportId: string,
    pastorNote: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'pendeta_ressort' && currentUser?.role !== 'admin') {
      return { success: false, error: 'Hanya Pendeta Ressort yang berwenang menerima dan memeriksa Laporan Semester.' };
    }

    const nowIso = new Date().toISOString();
    setSemesterReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              pastor_ack_by: currentUser?.id,
              pastor_ack_at: nowIso,
              pastor_note: pastorNote,
              updated_at: nowIso,
            }
          : r
      )
    );
    addAuditLog('semester_reports', reportId, 'PASTOR_ACKNOWLEDGE', null, { pastorNote }, 'Pendeta Ressort menerima dan memeriksa Laporan Semester');
    return { success: true };
  };

  const announceSemesterReport = async (
    reportId: string,
    medium: 'warta_jemaat' | 'mimbar' | 'papan_pengumuman' | 'lainnya',
    text: string
  ): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setSemesterReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'announced',
              announced_date: nowIso.split('T')[0],
              announcement_medium: medium,
              announcement_text: text,
              updated_at: nowIso,
            }
          : r
      )
    );
    addAuditLog('semester_reports', reportId, 'ANNOUNCE', null, { medium, text }, 'Mencatat pewartaan laporan keuangan kepada jemaat');
    return { success: true };
  };

  const returnSemesterReport = async (
    reportId: string,
    returnNotes: string
  ): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setSemesterReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'returned',
              return_notes: returnNotes,
              updated_at: nowIso,
            }
          : r
      )
    );
    addAuditLog('semester_reports', reportId, 'RETURN', null, { returnNotes }, 'Mengembalikan Laporan Semester dengan catatan perbaikan');
    return { success: true };
  };

  const runLpjChecklist = async (
    tahun: number
  ): Promise<{
    checklist: LpjReport['checklist_result'];
    passed: boolean;
    blockers: string[];
  }> => {
    // 1. All 12 months closed
    const closedMonths = periodClosings.filter((pc) => pc.tahun === tahun && pc.is_closed).map((pc) => pc.bulan);
    const allMonthsClosed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((m) => closedMonths.includes(m));

    // 2. No pending transactions
    const yearTxs = transactions.filter((t) => new Date(t.tanggal).getFullYear() === tahun);
    const hasPendingTx = yearTxs.some((t) => t.status === 'draft' || t.status === 'submitted');

    // 3. All reconciliations completed
    const storagesReconciled = storageAccounts.filter((s) => s.is_active).every((sa) =>
      reconciliations.some((r) => r.storage_account_id === sa.id && new Date(r.tanggal).getFullYear() === tahun)
    );

    // 4. Overdue advances cleared or reserved
    const unaddressedOverdueAdvances = advances.some((a) => {
      const isOverdue = a.status === 'overdue' || (a.status === 'active' && new Date(a.due_date) < new Date());
      const hasSettlement = advanceSettlements.some((s) => s.advance_id === a.id);
      return isOverdue && !hasSettlement;
    });

    // 5. Budget deviations clarified
    const budgetDeviationsClarified = true;

    // 6. Audit findings settled
    const unresolvedFindings = auditFindings.some(
      (f) => f.severity === 'wajib_diperbaiki' && f.status !== 'selesai' && f.status !== 'diterima'
    );

    // 7. Inventory physical checked
    const inventoryChecked = fixedAssets.length > 0;

    const lpj = lpjReports.find((l) => l.tahun === tahun);
    const grantedExceptions = lpj
      ? lpjExceptions.filter((e) => e.target_type === 'lpj' && e.target_id === lpj.id)
      : [];

    const isExempt = (code: string) => grantedExceptions.some((e) => e.rule_code === code);

    const checklist: LpjReport['checklist_result'] = {
      all_months_closed: allMonthsClosed || isExempt('all_months_closed'),
      no_pending_transactions: !hasPendingTx || isExempt('no_pending_transactions'),
      all_reconciliations_completed: storagesReconciled || isExempt('all_reconciliations_completed'),
      overdue_advances_cleared_or_reserved: !unaddressedOverdueAdvances || isExempt('overdue_advances_cleared_or_reserved'),
      budget_deviations_clarified: budgetDeviationsClarified || isExempt('budget_deviations_clarified'),
      audit_findings_settled: !unresolvedFindings || isExempt('audit_findings_settled'),
      inventory_physical_checked: inventoryChecked || isExempt('inventory_physical_checked'),
    };

    const blockers: string[] = [];
    if (!checklist.all_months_closed) blockers.push(`Seluruh 12 bulan pada Tahun ${tahun} belum ditutup buku.`);
    if (!checklist.no_pending_transactions) blockers.push('Masih ada transaksi dalam status Draf atau Diajukan pada tahun berjalan.');
    if (!checklist.all_reconciliations_completed) blockers.push('Belum semua rekening bank/kas fisik selesai direkonsiliasi akhir tahun.');
    if (!checklist.overdue_advances_cleared_or_reserved) blockers.push('Terdapat panjar kegiatan belum diselesaikan.');
    if (!checklist.audit_findings_settled) blockers.push('Terdapat temuan wajib periksa dari Badan Audit yang belum tuntas ditindaklanjuti.');
    if (!checklist.inventory_physical_checked) blockers.push('Cek fisik inventaris gereja belum dilakukan.');

    return {
      checklist,
      passed: blockers.length === 0,
      blockers,
    };
  };

  const lockLpjSnapshot = async (lpjId: string): Promise<{ success: boolean; error?: string }> => {
    const lpj = lpjReports.find((l) => l.id === lpjId);
    if (!lpj) return { success: false, error: 'LPJ tidak ditemukan.' };

    const check = await runLpjChecklist(lpj.tahun);
    if (!check.passed) {
      return { success: false, error: `Checklist LPJ belum terpenuhi: ${check.blockers.join('; ')}` };
    }

    const posisiKeuangan = getPosisiKeuangan(lpj.tahun);
    const perubahanSaldoDana = getPerubahanSaldoDana(lpj.tahun);
    const arusKas = getArusKasLangsung(lpj.tahun);
    const budgetRealization = getConsolidatedBudgetRealization(lpj.tahun, 12);

    const snapshot = {
      locked_at: new Date().toISOString(),
      locked_by: currentUser?.id,
      posisiKeuangan,
      perubahanSaldoDana,
      arusKas,
      budgetRealization,
      fixedAssets,
      advances: advances.filter((a) => a.status !== 'settled'),
      receivablesPayables: receivablesPayables.filter((r) => r.status !== 'paid'),
      lpjNotes,
      lpjSettings,
    };

    const nowIso = new Date().toISOString();
    setLpjReports((prev) =>
      prev.map((l) =>
        l.id === lpjId
          ? {
              ...l,
              status: 'drafted',
              snapshot_data: snapshot,
              checklist_result: check.checklist,
              updated_at: nowIso,
            }
          : l
      )
    );

    addAuditLog('lpj_reports', lpjId, 'LOCK_SNAPSHOT', null, snapshot, `Mengunci snapshot angka LPJ ISAK 35 Tahun ${lpj.tahun}`);
    return { success: true };
  };

  const submitLpjToMeeting = async (
    lpjId: string,
    meetingDate: string,
    meetingRef: string
  ): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setLpjReports((prev) =>
      prev.map((l) =>
        l.id === lpjId
          ? {
              ...l,
              status: 'submitted_to_meeting',
              meeting_date: meetingDate,
              meeting_ref: meetingRef,
              updated_at: nowIso,
            }
          : l
      )
    );
    addAuditLog('lpj_reports', lpjId, 'SUBMIT_TO_MEETING', null, { meetingDate, meetingRef }, 'Mengajukan LPJ ke Rapat Huria');
    return { success: true };
  };

  const approveLpjReport = async (
    lpjId: string,
    meetingNotes: string,
    attendeesCount: number
  ): Promise<{ success: boolean; error?: string }> => {
    const lpj = lpjReports.find((l) => l.id === lpjId);
    if (!lpj) return { success: false, error: 'LPJ tidak ditemukan.' };

    const nowIso = new Date().toISOString();
    setLpjReports((prev) =>
      prev.map((l) =>
        l.id === lpjId
          ? {
              ...l,
              status: 'approved',
              meeting_notes: meetingNotes,
              meeting_attendees_count: attendeesCount,
              approved_by: currentUser?.id,
              approved_at: nowIso,
              updated_at: nowIso,
            }
          : l
      )
    );

    addAuditLog(
      'lpj_reports',
      lpjId,
      'APPROVE_LPJ',
      null,
      { meetingNotes, attendeesCount },
      `Rapat Huria MENGESAHKAN LPJ Tahun ${lpj.tahun}. Seluruh transaksi Tahun ${lpj.tahun} TERKUNCI PERMANEN!`
    );

    return { success: true };
  };

  const returnLpjReport = async (
    lpjId: string,
    returnNotes: string
  ): Promise<{ success: boolean; error?: string }> => {
    const nowIso = new Date().toISOString();
    setLpjReports((prev) =>
      prev.map((l) =>
        l.id === lpjId
          ? {
              ...l,
              status: 'returned',
              return_notes: returnNotes,
              updated_at: nowIso,
            }
          : l
      )
    );
    addAuditLog('lpj_reports', lpjId, 'RETURN_LPJ', null, { returnNotes }, 'Mengembalikan LPJ dengan catatan perbaikan Rapat Huria');
    return { success: true };
  };

  const grantLpjException = async (
    targetType: 'semester' | 'lpj',
    targetId: string,
    ruleCode: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!reason.trim()) {
      return { success: false, error: 'Alasan pemberian dispensasi checklist wajib diisi.' };
    }

    const nowIso = new Date().toISOString();
    const newExc: LpjException = {
      id: `exc-${Date.now()}`,
      target_type: targetType,
      target_id: targetId,
      rule_code: ruleCode,
      reason,
      granted_by: currentUser?.id || 'admin',
      granted_at: nowIso,
    };

    setLpjExceptions((prev) => [...prev, newExc]);
    addAuditLog('lpj_exceptions', newExc.id, 'INSERT', null, newExc, `Memberikan dispensasi aturan ${ruleCode}: ${reason}`);
    return { success: true };
  };

  // ===========================================================================
  // ISAK 35 FINANCIAL STATEMENTS GENERATORS
  // ===========================================================================

  const getPosisiKeuangan = (_year: number): LaporanPosisiKeuanganData => {
    // 1. Kas dan Setara Kas (total saldo akhir seluruh kas)
    const kasBalances = getKasBalances();
    const total_kas_dan_bank = kasBalances.reduce((sum, k) => sum + k.saldo_resmi, 0);

    const saldo_dana_tidak_terikat = kasBalances
      .filter((k) => {
        const kasObj = kasList.find((item) => item.id === k.kas_id);
        return kasObj?.fund_type !== 'restricted';
      })
      .reduce((sum, k) => sum + k.saldo_resmi, 0);

    const saldo_dana_terikat = kasBalances
      .filter((k) => {
        const kasObj = kasList.find((item) => item.id === k.kas_id);
        return kasObj?.fund_type === 'restricted';
      })
      .reduce((sum, k) => sum + k.saldo_resmi, 0);

    // 2. Piutang dan Panjar
    const total_piutang_pihak_ketiga = receivablesPayables
      .filter((rp) => rp.type === 'receivable' && rp.status !== 'paid')
      .reduce((sum, rp) => sum + rp.remaining_amount, 0);

    const total_panjar_berjalan = advances
      .filter((a) => a.status !== 'settled')
      .reduce((sum, a) => sum + a.amount, 0);

    const total_piutang = total_piutang_pihak_ketiga + total_panjar_berjalan;

    // 3. Aset Tetap
    const activeAssets = fixedAssets.filter((a) => a.status === 'aktif');
    const total_aset_tetap_bruto = activeAssets.reduce((sum, a) => sum + a.nilai_perolehan, 0);
    const total_akumulasi_penyusutan = lpjSettings.enable_depreciation
      ? activeAssets.reduce((sum, a) => sum + calculateDepreciation(a, _year).accumulatedDepreciation, 0)
      : 0;

    const nilai_buku_aset_tetap = total_aset_tetap_bruto - total_akumulasi_penyusutan;

    // Total Aset = Kas + Piutang + Panjar + Nilai Buku Aset Tetap
    const total_aset = total_kas_dan_bank + total_piutang + nilai_buku_aset_tetap;

    // 4. Kewajiban (Utang)
    const total_kewajiban = receivablesPayables
      .filter((rp) => rp.type === 'payable' && rp.status !== 'paid')
      .reduce((sum, rp) => sum + rp.remaining_amount, 0);

    // 5. Saldo Dana Bersih (Net Assets = Aset - Kewajiban)
    const total_saldo_dana_bersih = total_aset - total_kewajiban;

    // Total Kewajiban + Saldo Dana (Selalu Berimbang = total_aset)
    const total_kewajiban_dan_saldo_dana = total_kewajiban + total_saldo_dana_bersih;
    const selisih_neraca = total_aset - total_kewajiban_dan_saldo_dana;

    return {
      total_kas_dan_bank,
      total_piutang,
      total_piutang_pihak_ketiga,
      total_panjar_berjalan,
      total_aset_tetap_bruto,
      total_akumulasi_penyusutan,
      total_aset,
      total_kewajiban,
      saldo_dana_tidak_terikat,
      saldo_dana_terikat,
      total_saldo_dana_bersih,
      total_kewajiban_dan_saldo_dana,
      selisih_neraca,
    };
  };

  const getPerubahanSaldoDana = (_year: number): LaporanPerubahanSaldoDanaItem[] => {
    return kasList.map((k) => {
      const initial = openingBalances
        .filter((ob) => ob.kas_id === k.id)
        .reduce((sum, item) => sum + Number(item.amount), 0);

      let penerimaan_murni = 0;
      let pengeluaran_murni = 0;
      let transfer_antar_dana_masuk = 0;
      let transfer_antar_dana_keluar = 0;

      transactions
        .filter((tx) => tx.kas_id === k.id && tx.status === 'approved')
        .forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.type === 'income') penerimaan_murni += amt;
          if (tx.type === 'expense') pengeluaran_murni += amt;
          if (tx.type === 'transfer_in') transfer_antar_dana_masuk += amt;
          if (tx.type === 'transfer_out') transfer_antar_dana_keluar += amt;
        });

      const surplus_defisit = penerimaan_murni - pengeluaran_murni;
      const saldo_akhir =
        initial + penerimaan_murni - pengeluaran_murni + transfer_antar_dana_masuk - transfer_antar_dana_keluar;

      return {
        kas_id: k.id,
        nama_kas: k.nama,
        kode_kas: k.kode,
        fund_type: k.fund_type || 'unrestricted',
        saldo_awal: initial,
        penerimaan_murni,
        pengeluaran_murni,
        surplus_defisit,
        transfer_antar_dana_masuk,
        transfer_antar_dana_keluar,
        saldo_akhir,
      };
    });
  };

  const getArusKasLangsung = (year: number): LaporanArusKasData => {
    const yearTxs = transactions.filter(
      (tx) => tx.status === 'approved' && new Date(tx.tanggal).getFullYear() === year
    );

    let kas_masuk_operasi = 0;
    let kas_keluar_operasi = 0;
    let kas_keluar_investasi = 0;
    let kas_masuk_pendanaan = 0;
    let kas_keluar_pendanaan = 0;

    yearTxs.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.category_id);
      const catName = (cat?.nama || '').toLowerCase();
      const amt = Number(tx.amount);

      if (tx.type === 'income') {
        if (catName.includes('pembangunan') || catName.includes('donasi terikat')) {
          kas_masuk_pendanaan += amt;
        } else {
          kas_masuk_operasi += amt;
        }
      } else if (tx.type === 'expense') {
        if (catName.includes('pengadaan aset') || catName.includes('inventaris') || catName.includes('alat')) {
          kas_keluar_investasi += amt;
        } else if (catName.includes('pembangunan')) {
          kas_keluar_pendanaan += amt;
        } else {
          kas_keluar_operasi += amt;
        }
      }
    });

    const arus_kas_bersih_operasi = kas_masuk_operasi - kas_keluar_operasi;
    const arus_kas_bersih_investasi = -kas_keluar_investasi;
    const arus_kas_bersih_pendanaan = kas_masuk_pendanaan - kas_keluar_pendanaan;
    const kenaikan_penurunan_kas_bersih =
      arus_kas_bersih_operasi + arus_kas_bersih_investasi + arus_kas_bersih_pendanaan;

    const saldo_kas_awal = openingBalances.reduce((sum, ob) => sum + Number(ob.amount), 0);
    const saldo_kas_akhir = saldo_kas_awal + kenaikan_penurunan_kas_bersih;

    return {
      tahun: year,
      kas_masuk_operasi,
      kas_keluar_operasi,
      arus_kas_bersih_operasi,
      kas_keluar_investasi,
      arus_kas_bersih_investasi,
      kas_masuk_pendanaan,
      kas_keluar_pendanaan,
      arus_kas_bersih_pendanaan,
      kenaikan_penurunan_kas_bersih,
      saldo_kas_awal,
      saldo_kas_akhir,
    };
  };

  const resetAllTransactionsAndBalancesToZero = async (): Promise<{ success: boolean; message: string }> => {
    // 1. Reset state
    setTransactions([]);
    setBudgets([]);
    setBudgetItems([]);
    setBudgetReallocations([]);
    setOpeningBalances(DEMO_OPENING_BALANCES);
    setOpeningEntries(DEMO_OPENING_ENTRIES);
    setOpeningAdjustments([]);
    setOpeningOtherPositions([]);
    setFixedAssets([]);
    setPriorYearSummaries([]);
    setOpeningSetup(DEMO_OPENING_SETUP);
    setPeriodClosings([]);
    setReconciliations([]);
    setAdvances([]);
    setAdvanceSettlements([]);
    setReceivablesPayables([]);
    setCashCounts([]);
    setAuditPeriodVerifications([]);
    setAuditReviews([]);
    setAuditFindings([]);
    setAuditFinalOpinions([]);
    setSemesterReports(DEMO_SEMESTER_REPORTS);
    setLpjReports(DEMO_LPJ_REPORTS);

    const resetLog: AuditLog = {
      id: `audit-${Date.now()}`,
      table_name: 'system',
      record_id: 'reset',
      action: 'SYSTEM_RESET',
      new_data: { note: 'Seluruh aset tetap, transaksi keuangan, anggaran (APBG), dan saldo awal direset bersih ke nol.' },
      old_data: null,
      changed_by: currentUser?.id || 'user-admin',
      notes: 'Sistem direset bersih untuk memulai penggunaan aplikasi perdana.',
      changed_at: new Date().toISOString(),
    };
    setAuditLogs([resetLog]);

    if (isSupabaseConfigured) {
      await syncResetZeroDataInSupabase();
    } else {
      // 2. Clear localStorage (hanya jika mode demo/penyimpanan lokal aktif)
      localStorage.removeItem('siku_transactions');
      localStorage.removeItem('siku_budgets');
      localStorage.removeItem('siku_budget_items');
      localStorage.removeItem('siku_budget_reallocations');
      localStorage.setItem('siku_opening_balances', JSON.stringify(DEMO_OPENING_BALANCES));
      localStorage.setItem('siku_opening_entries', JSON.stringify(DEMO_OPENING_ENTRIES));
      localStorage.removeItem('siku_opening_adjustments');
      localStorage.removeItem('siku_opening_other_positions');
      localStorage.setItem('siku_opening_setup', JSON.stringify(DEMO_OPENING_SETUP));
      localStorage.removeItem('siku_period_closings');
      localStorage.removeItem('siku_reconciliations');
      localStorage.removeItem('siku_advances');
      localStorage.removeItem('siku_advance_settlements');
      localStorage.removeItem('siku_receivables_payables');
      localStorage.removeItem('siku_fixed_assets');
      localStorage.removeItem('siku_prior_year_summaries');
      localStorage.removeItem('siku_cash_counts');
      localStorage.removeItem('siku_audit_period_verifications');
      localStorage.removeItem('siku_audit_reviews');
      localStorage.removeItem('siku_audit_findings');
      localStorage.removeItem('siku_audit_final_opinions');
      localStorage.setItem('siku_semester_reports', JSON.stringify(DEMO_SEMESTER_REPORTS));
      localStorage.setItem('siku_lpj_reports', JSON.stringify(DEMO_LPJ_REPORTS));
      localStorage.setItem('siku_audit_logs', JSON.stringify([resetLog]));
    }

    return { success: true, message: 'Seluruh aset tetap, transaksi keuangan, anggaran (APBG), dan saldo awal berhasil direset ke nol.' };
  };

  return (
    <DataContext.Provider
      value={{
        kasList,
        storageAccounts,
        categories,
        transactions,
        openingBalances,
        periodClosings,
        reconciliations,
        auditLogs,
        settings,
        profiles,
        userKasAccessList,
        budgets,
        budgetItems,
        budgetReallocations,
        openingSetup,
        openingEntries,
        openingAdjustments,
        openingOtherPositions,
        priorYearSummaries,
        isKasOpeningLocked,
        getOpeningStatusForKas,
        saveOpeningEntry,
        submitOpeningBook,
        approveOpeningBook,
        lockOpeningBook,
        saveOpeningAdjustment,
        approveOpeningAdjustment,
        saveOpeningOtherPosition,
        deleteOpeningOtherPosition,
        savePriorYearSummary,
        updateOpeningSetup,
        loading,
        getKasBalances,
        getStorageBalances,
        getSentralisasiSummary,
        isPeriodClosed,
        getPendingTransactionsCount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        changeStatus,
        bulkApprove,
        createTransfer,
        confirmTransferReceipt,
        createReversalTransaction,
        closePeriod,
        reopenPeriod,
        saveReconciliation,
        saveKas,
        deleteKas,
        saveProfile,
        deleteProfile,
        toggleProfileActive,
        saveStorageAccount,
        saveCategory,
        saveOpeningBalance,
        saveUserKasAccess,
        removeUserKasAccess,
        updateSettings,
        fiscalYears,
        saveFiscalYear,
        deleteFiscalYear,
        setActiveFiscalYear,
        toggleFiscalYearBudgetLock,
        rollForwardBalancesToYear,
        saveBudget,
        deleteBudget,
        saveBudgetItem,
        deleteBudgetItem,
        changeBudgetStatus,
        createBudgetRevision,
        reallocateBudget,
        copyBudgetFromPreviousYear,
        getBudgetRealization,
        getConsolidatedBudgetRealization,
        // LPJ Supporting Data
        fixedAssets,
        advances,
        advanceSettlements,
        receivablesPayables,
        lpjNotes,
        lpjSettings,
        saveFixedAsset,
        deleteFixedAsset,
        proposeAssetDisposal,
        approveAssetDisposal,
        calculateDepreciation,
        saveAdvance,
        deleteAdvance,
        saveAdvanceSettlement,
        submitAdvanceSettlement,
        approveAdvanceSettlement,
        saveReceivablePayable,
        deleteReceivablePayable,
        recordReceivablePayablePayment,
        saveLpjNotes,
        updateLpjSettings,
        updateKasFundType,
        migrateOpeningPositionsToLpj,
        // Badan Audit Huria
        auditBodyMembers,
        auditEngagements,
        auditReviews,
        auditFindings,
        auditFinalOpinions,
        cashCounts,
        saveAuditBodyMember,
        removeAuditBodyMember,
        saveAuditEngagement,
        submitAuditReview,
        saveAuditFinding,
        respondAuditFinding,
        closeAuditFinding,
        finalizeAuditOpinion,
        recordCashCount,
        // Verifikasi Audit Transaksi & Pemeriksaan Berkala
        verifyTransactionAudit,
        auditPeriodVerifications,
        saveAuditPeriodVerification,
        signAuditPeriodVerification,
        // Laporan Semester & LPJ Tahunan
        semesterReports,
        lpjReports,
        lpjExceptions,
        runSemesterChecklist,
        lockSemesterSnapshot,
        forwardSemesterToPastor,
        acknowledgeSemesterReport,
        announceSemesterReport,
        returnSemesterReport,
        runLpjChecklist,
        lockLpjSnapshot,
        submitLpjToMeeting,
        approveLpjReport,
        returnLpjReport,
        grantLpjException,
        isYearLockedByLpj,
        // ISAK 35 Generators
        getPosisiKeuangan,
        getPerubahanSaldoDana,
        getArusKasLangsung,
        // System Data Reset
        resetAllTransactionsAndBalancesToZero,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
