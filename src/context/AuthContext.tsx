/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserKasAccess, UserRole } from '../types/database';
import { DEMO_PROFILES, DEMO_USER_KAS_ACCESS } from '../lib/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: Profile | null;
  userKasAccess: UserKasAccess[];
  loading: boolean;
  isDemoMode: boolean;
  loginWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  switchDemoUser: (userId: string) => void;
  availableDemoUsers: Profile[];
  canInputKas: (kasId: string) => boolean;
  canApproveKas: (kasId: string) => boolean;
  isLeader: boolean;
  isAdmin: boolean;
  isBendaharaUmum: boolean;
  isAuditor: boolean;
  isPendeta: boolean;
  isSekretaris: boolean;
  isMajelis: boolean;
  isPengurusKas: boolean;
  canRecordTransactions: boolean;
  canTransfer: boolean;
  canApprove: boolean;
  canAudit: boolean;
  canClosePeriod: boolean;
  canManageSettings: boolean;
  canManageMasterData: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'siku_hkbp_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userKasAccess, setUserKasAccess] = useState<UserKasAccess[]>(DEMO_USER_KAS_ACCESS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setCurrentUser(profile);
              setIsDemoMode(false);
              // Fetch user kas access
              const { data: access } = await supabase
                .from('user_kas_access')
                .select('*')
                .eq('user_id', session.user.id);
              if (access) setUserKasAccess(access);
              setLoading(false);
              return;
            }
          } else {
            // Check stored user ID directly in Supabase profiles table
            const savedUserId = localStorage.getItem(LOCAL_STORAGE_USER_KEY) || 'user-bendum';
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', savedUserId)
              .single();

            if (profile) {
              setCurrentUser(profile);
              setIsDemoMode(false);
              const { data: access } = await supabase
                .from('user_kas_access')
                .select('*')
                .eq('user_id', profile.id);
              if (access) setUserKasAccess(access);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Supabase auth session error, falling back to local session:', err);
        }
      }

      // Default demo session
      const getStoredProfiles = (): Profile[] => {
        const stored = localStorage.getItem('siku_profiles');
        return stored ? JSON.parse(stored) : DEMO_PROFILES;
      };
      const profilesList = getStoredProfiles();
      const savedUserId = localStorage.getItem(LOCAL_STORAGE_USER_KEY) || 'user-bendum';
      const initialUser = profilesList.find((p) => p.id === savedUserId) || profilesList[1] || DEMO_PROFILES[1];
      setCurrentUser(initialUser);
      setUserKasAccess(DEMO_USER_KAS_ACCESS.filter((a) => a.user_id === initialUser.id));
      setIsDemoMode(true);
      setLoading(false);
    }

    initAuth();
  }, []);

  const getActiveProfiles = (): Profile[] => {
    const stored = localStorage.getItem('siku_profiles');
    return stored ? JSON.parse(stored) : DEMO_PROFILES;
  };

  const switchDemoUser = (userId: string) => {
    const list = getActiveProfiles();
    const selected = list.find((p) => p.id === userId);
    if (selected) {
      setCurrentUser(selected);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, userId);
      setUserKasAccess(DEMO_USER_KAS_ACCESS.filter((a) => a.user_id === selected.id));
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // If Supabase Auth account is not yet created, check public.profiles table in Supabase
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', email.trim())
            .single();

          if (dbProfile) {
            setCurrentUser(dbProfile);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, dbProfile.id);
            const { data: access } = await supabase
              .from('user_kas_access')
              .select('*')
              .eq('user_id', dbProfile.id);
            if (access) setUserKasAccess(access);
            setIsDemoMode(false);
            return { error: null };
          }
          return { error };
        }
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profile) {
            setCurrentUser(profile);
            setIsDemoMode(false);
          }
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    } else {
      // In Demo Mode: match by email
      const matched = DEMO_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        switchDemoUser(matched.id);
        return { error: null };
      }
      return { error: new Error('Pengguna tidak ditemukan dalam daftar akun percontohan.') };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    // Switch to viewer / majelis demo user
    const majelisUser = DEMO_PROFILES.find((p) => p.role === 'majelis') || DEMO_PROFILES[0];
    setCurrentUser(majelisUser);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  // Permission helpers
  const isAdmin = currentUser?.role === 'admin';
  const isBendaharaUmum = currentUser?.role === 'bendahara_umum';
  const isAuditor = currentUser?.role === 'auditor';
  const isPendeta = currentUser?.role === 'pendeta_ressort';
  const isSekretaris = currentUser?.role === 'sekretaris';
  const isMajelis = currentUser?.role === 'majelis';
  const isPengurusKas = currentUser?.role === 'pengurus_kas';
  const isLeader = Boolean(
    currentUser &&
    ['admin', 'bendahara_umum', 'pendeta_ressort', 'sekretaris', 'majelis'].includes(currentUser.role)
  );

  // Authority to record daily transactions (Income / Expense / Reversals)
  // Strictly disabled for Auditor, Pendeta Ressort, Sekretaris Huria, and Majelis
  const canRecordTransactions = Boolean(
    currentUser &&
    (isAdmin || isBendaharaUmum || (isPengurusKas && userKasAccess.some((a) => a.access_level === 'bendahara')))
  );

  // Authority to transfer between Kas
  const canTransfer = Boolean(
    currentUser &&
    (isAdmin || isBendaharaUmum || (isPengurusKas && userKasAccess.some((a) => a.access_level === 'bendahara')))
  );

  // Authority to approve submitted transactions
  const canApprove = Boolean(
    currentUser &&
    (isAdmin || isPendeta || isSekretaris || userKasAccess.some((a) => a.access_level === 'ketua'))
  );

  // Authority to perform audit, verification, and findings (Pasal 7 & 44 AP HKBP)
  const canAudit = Boolean(currentUser && (isAdmin || isAuditor));

  // Authority to close monthly periods
  const canClosePeriod = Boolean(currentUser && (isAdmin || isBendaharaUmum));

  // Authority for system settings and Kop resmi
  const canManageSettings = Boolean(currentUser && isAdmin);

  // Authority for master data (kas, storage, accounts)
  const canManageMasterData = Boolean(currentUser && (isAdmin || isBendaharaUmum));

  const canInputKas = (kasId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'bendahara_umum') {
      // Bendahara umum inputs for Kas Umum (kode kas-1) and can input generally
      return true;
    }
    // Auditor, Pendeta, Sekretaris, Majelis CANNOT input transactions directly
    if (['auditor', 'pendeta_ressort', 'sekretaris', 'majelis'].includes(currentUser.role)) {
      return false;
    }
    // Check if user has 'bendahara' access level for this specific kas
    return userKasAccess.some((a) => a.kas_id === kasId && a.access_level === 'bendahara');
  };

  const canApproveKas = (kasId: string): boolean => {
    if (!currentUser) return false;
    // Auditor NEVER approves transactions (independence requirement)
    if (currentUser.role === 'auditor') return false;

    // Bendahara Umum NEVER approves transactions (four-eyes principle)
    if (currentUser.role === 'bendahara_umum') return false;

    // Pendeta Ressort and Sekretaris approve Kas Umum and supervisory
    if (currentUser.role === 'pendeta_ressort') return true;
    if (currentUser.role === 'sekretaris' && kasId === 'kas-1') return true;

    // Ketua on this specific kas
    return userKasAccess.some((a) => a.kas_id === kasId && a.access_level === 'ketua');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userKasAccess,
        loading,
        isDemoMode,
        loginWithEmail,
        logout,
        switchDemoUser,
        availableDemoUsers: getActiveProfiles(),
        canInputKas,
        canApproveKas,
        isLeader,
        isAdmin,
        isBendaharaUmum,
        isAuditor,
        isPendeta,
        isSekretaris,
        isMajelis,
        isPengurusKas,
        canRecordTransactions,
        canTransfer,
        canApprove,
        canAudit,
        canClosePeriod,
        canManageSettings,
        canManageMasterData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
