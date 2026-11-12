/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import BudgetPage from './pages/BudgetPage';
import OpeningBalancePage from './pages/OpeningBalancePage';
import LpjDataPage from './pages/LpjDataPage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { PeriodClosingPage } from './pages/PeriodClosingPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { UserGuidePage } from './pages/UserGuidePage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="opening-balance" element={<OpeningBalancePage />} />
                <Route path="approvals" element={<ApprovalQueuePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="lpj-data" element={<LpjDataPage />} />
                <Route path="closing" element={<PeriodClosingPage />} />
                <Route path="master" element={<MasterDataPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="guide" element={<UserGuidePage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
